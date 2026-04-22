-- Migration 045: Giveaway winner bonus (+20 🥜)
-- Repurposes the orphan reason='giveaway' (master plan §14, L4 decision).
-- When a monthly lottery winner is notified, they receive +20 credits in
-- addition to the physical book prize. Idempotent per winner row.

CREATE OR REPLACE FUNCTION public.grant_giveaway_bonus(
  p_winner_id uuid,
  p_amount    int DEFAULT 20
)
RETURNS TABLE (status text, new_balance int)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid;
  v_already_granted int;
  v_new_balance int;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 OR p_amount > 100 THEN
    RETURN QUERY SELECT 'invalid_amount'::text, 0;
    RETURN;
  END IF;

  -- Resolve the winner row
  SELECT user_id INTO v_user_id
  FROM public.lottery_winners
  WHERE id = p_winner_id;

  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT 'winner_not_found'::text, 0;
    RETURN;
  END IF;

  -- Concurrency guard: one bonus transaction at a time per user
  PERFORM pg_advisory_xact_lock(hashtext('credits_' || v_user_id::text));

  -- Idempotency: already granted for this winner row?
  SELECT COUNT(*) INTO v_already_granted
  FROM public.credit_transactions
  WHERE reason = 'giveaway'
    AND ref_id = p_winner_id
    AND amount > 0;

  IF v_already_granted > 0 THEN
    SELECT credits INTO v_new_balance
    FROM public.profiles
    WHERE id = v_user_id;
    RETURN QUERY SELECT 'already_granted'::text, COALESCE(v_new_balance, 0);
    RETURN;
  END IF;

  -- Grant the bonus
  UPDATE public.profiles
     SET credits = COALESCE(credits, 0) + p_amount
   WHERE id = v_user_id
   RETURNING credits INTO v_new_balance;

  INSERT INTO public.credit_transactions (user_id, amount, reason, ref_id)
  VALUES (v_user_id, p_amount, 'giveaway', p_winner_id);

  RETURN QUERY SELECT 'granted'::text, COALESCE(v_new_balance, 0);
END;
$$;

REVOKE ALL ON FUNCTION public.grant_giveaway_bonus(uuid, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.grant_giveaway_bonus(uuid, int) TO service_role;
