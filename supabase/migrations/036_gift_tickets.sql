-- ══════════════════════════════════════════════════════════════
-- 036: Gift tickets between users (Phase C — social)
-- ──────────────────────────────────────────────────────────────
-- Users can gift lottery tickets to other users by email.
--
-- Design decisions (master plan §13 C-R8..C-R12):
--  * Extend ticket_transactions.reason CHECK via NOT VALID + VALIDATE
--  * Distinct reasons: 'gift_sent' (sender, negative amount) and
--    'gift_received' (recipient, positive) — so leaderboards /
--    milestones / analytics can distinguish from regular buys.
--  * Rate limit: max 3 gifts sent per UTC day (C-R9).
--  * Self-gift blocked (C-R10).
--  * Unknown recipient returns recipient_not_found — balance never
--    deducted (C-R8).
--  * Gift does NOT count toward milestone_* totals for recipient:
--    the AFTER INSERT trigger on credit_transactions only reads
--    credit_transactions (tickets live in ticket_transactions), so
--    gift_received here cannot inflate milestone progress.
-- ══════════════════════════════════════════════════════════════

-- ─── 1. Extend ticket_transactions.reason CHECK ─────────────
ALTER TABLE public.ticket_transactions
  DROP CONSTRAINT IF EXISTS ticket_transactions_reason_check;

ALTER TABLE public.ticket_transactions
  ADD CONSTRAINT ticket_transactions_reason_check
  CHECK (reason IN (
    'review_reward', 'peanut_purchase', 'giveaway_entry', 'admin',
    'gift_sent', 'gift_received'
  )) NOT VALID;

ALTER TABLE public.ticket_transactions
  VALIDATE CONSTRAINT ticket_transactions_reason_check;

-- ─── 2. gift_tickets RPC ────────────────────────────────────
CREATE OR REPLACE FUNCTION public.gift_tickets(
  p_sender_id uuid,
  p_recipient_email text,
  p_quantity int
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_recipient_id uuid;
  v_recipient_email text;
  v_sender_balance int;
  v_gifts_today int;
  v_sender_tx_id uuid;
  v_email_norm text;
BEGIN
  -- Validate quantity early.
  IF p_quantity IS NULL OR p_quantity < 1 OR p_quantity > 5 THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_quantity');
  END IF;

  v_email_norm := lower(trim(coalesce(p_recipient_email, '')));
  IF v_email_norm = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_email');
  END IF;

  -- Serialize sender gifts to avoid double-spend.
  PERFORM pg_advisory_xact_lock(hashtext('gift_' || p_sender_id::text));

  -- Look up recipient by normalized email.
  SELECT id, email INTO v_recipient_id, v_recipient_email
  FROM public.profiles
  WHERE lower(email) = v_email_norm
  LIMIT 1;

  IF v_recipient_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'recipient_not_found');
  END IF;

  IF v_recipient_id = p_sender_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'self_gift_not_allowed');
  END IF;

  -- Rate limit: 3 gifts per UTC day.
  SELECT COUNT(*) INTO v_gifts_today
  FROM public.ticket_transactions
  WHERE user_id = p_sender_id
    AND reason = 'gift_sent'
    AND created_at >= ((now() at time zone 'utc')::date)::timestamptz;

  IF v_gifts_today >= 3 THEN
    RETURN jsonb_build_object('success', false, 'error', 'rate_limit', 'limit', 3);
  END IF;

  -- Check sender ticket balance.
  SELECT COALESCE(SUM(amount), 0) INTO v_sender_balance
  FROM public.ticket_transactions
  WHERE user_id = p_sender_id;

  IF v_sender_balance < p_quantity THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'insufficient_tickets',
      'balance', v_sender_balance
    );
  END IF;

  -- Deduct from sender.
  INSERT INTO public.ticket_transactions (user_id, amount, reason, ref_id)
  VALUES (p_sender_id, -p_quantity, 'gift_sent', v_recipient_id)
  RETURNING id INTO v_sender_tx_id;

  -- Credit recipient, ref_id points to sender tx for traceability.
  INSERT INTO public.ticket_transactions (user_id, amount, reason, ref_id)
  VALUES (v_recipient_id, p_quantity, 'gift_received', v_sender_tx_id);

  RETURN jsonb_build_object(
    'success', true,
    'quantity', p_quantity,
    'sender_balance', v_sender_balance - p_quantity,
    'recipient_email', v_recipient_email
  );
END;
$$;

COMMENT ON FUNCTION public.gift_tickets IS
  'Transfers lottery tickets from sender to recipient (by email). Rate-limited 3/day, self-gift blocked, 1..5 tickets per call.';
