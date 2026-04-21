-- ══════════════════════════════════════════════════════════════
-- 033: Boost extension
-- If a user already has an active boost of the same type on the
-- same review, extend its expires_at by p_duration_days instead
-- of rejecting with "boost_active". Charges the cost normally.
-- Returns { success, boost_id, expires_at, balance, extended:bool }
-- ══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.purchase_boost(
  p_user_id uuid,
  p_review_id uuid,
  p_boost_type text,
  p_cost int,
  p_duration_days int DEFAULT 7
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_balance int;
  v_boost_id uuid;
  v_existing_id uuid;
  v_existing_expires timestamptz;
  v_new_expires timestamptz;
  v_extended boolean := false;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('credits_' || p_user_id::text));

  -- Check balance first (applies to both extend and new purchase)
  SELECT COALESCE(SUM(amount), 0) INTO v_balance
  FROM public.credit_transactions
  WHERE user_id = p_user_id;

  IF v_balance < p_cost THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'insufficient_credits',
      'balance', v_balance,
      'cost', p_cost
    );
  END IF;

  -- Look for an existing active boost of same type on this review
  SELECT id, expires_at
    INTO v_existing_id, v_existing_expires
  FROM public.gallery_boosts
  WHERE review_id = p_review_id
    AND boost_type = p_boost_type
    AND expires_at > now()
    AND user_id = p_user_id
  ORDER BY expires_at DESC
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    -- Extend the existing boost
    v_new_expires := v_existing_expires + (p_duration_days || ' days')::interval;

    UPDATE public.gallery_boosts
       SET expires_at = v_new_expires
     WHERE id = v_existing_id;

    v_boost_id := v_existing_id;
    v_extended := true;
  ELSE
    -- Create a new boost
    v_new_expires := now() + (p_duration_days || ' days')::interval;

    INSERT INTO public.gallery_boosts (review_id, user_id, boost_type, expires_at)
    VALUES (p_review_id, p_user_id, p_boost_type, v_new_expires)
    RETURNING id INTO v_boost_id;
  END IF;

  -- Deduct credits (always charged)
  INSERT INTO public.credit_transactions (user_id, amount, reason, ref_id)
  VALUES (p_user_id, -p_cost, 'boost', v_boost_id);

  RETURN jsonb_build_object(
    'success', true,
    'boost_id', v_boost_id,
    'expires_at', v_new_expires,
    'balance', v_balance - p_cost,
    'extended', v_extended
  );
END;
$$;

COMMENT ON FUNCTION public.purchase_boost IS
  'Buys or extends a gallery boost. If an active boost of the same type exists on the review, extends expires_at by p_duration_days. Charges p_cost in both cases.';
