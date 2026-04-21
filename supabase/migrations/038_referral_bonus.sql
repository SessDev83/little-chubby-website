-- ══════════════════════════════════════════════════════════════
-- 038: Referral bonus for pending gift claims within 7 days
-- ──────────────────────────────────────────────────────────────
-- Incentive: if a recipient of a PENDING gift creates their
-- account and auto-claims the tickets within 7 days of the
-- original gift, the sender receives a REFERRAL BONUS equal to
-- the same number of tickets they gifted. The recipient keeps
-- their gift too — it's a win-win to encourage fast signups.
--
-- Safeguards:
--   * referral_bonus_paid_at on pending_gifts (idempotency).
--   * Bonus only paid on PENDING claims (not direct gifts where
--     the recipient was already registered).
--   * Bonus only paid if claimed_at - created_at <= 7 days.
--   * ticket_transactions.reason extended with 'referral_bonus'.
-- ══════════════════════════════════════════════════════════════

-- ─── 1. Column for idempotency ─────────────────────────────
ALTER TABLE public.pending_gifts
  ADD COLUMN IF NOT EXISTS referral_bonus_paid_at timestamptz;

-- ─── 2. Extend ticket_transactions.reason ───────────────────
ALTER TABLE public.ticket_transactions
  DROP CONSTRAINT IF EXISTS ticket_transactions_reason_check;

ALTER TABLE public.ticket_transactions
  ADD CONSTRAINT ticket_transactions_reason_check
  CHECK (reason IN (
    'review_reward', 'peanut_purchase', 'giveaway_entry', 'admin',
    'gift_sent', 'gift_received',
    'gift_sent_pending', 'gift_refund',
    'referral_bonus'
  )) NOT VALID;

ALTER TABLE public.ticket_transactions
  VALIDATE CONSTRAINT ticket_transactions_reason_check;

-- ─── 3. Update claim RPC to pay the bonus ───────────────────
CREATE OR REPLACE FUNCTION public.claim_pending_gifts_for_profile(p_user_id uuid)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_email text;
  v_email_norm text;
  v_claimed int := 0;
  v_bonus_window interval := interval '7 days';
  r record;
BEGIN
  SELECT email INTO v_email FROM public.profiles WHERE id = p_user_id;
  IF v_email IS NULL THEN
    RETURN 0;
  END IF;
  v_email_norm := lower(trim(v_email));

  PERFORM pg_advisory_xact_lock(hashtext('claim_' || p_user_id::text));

  FOR r IN
    SELECT id, sender_id, quantity, sender_tx_id, created_at
    FROM public.pending_gifts
    WHERE recipient_email_norm = v_email_norm
      AND claimed_at IS NULL
      AND refunded_at IS NULL
      AND expires_at > now()
    FOR UPDATE
  LOOP
    -- Credit the recipient.
    INSERT INTO public.ticket_transactions (user_id, amount, reason, ref_id)
    VALUES (p_user_id, r.quantity, 'gift_received', r.sender_tx_id);

    UPDATE public.pending_gifts
       SET claimed_at = now(), claimed_by = p_user_id
     WHERE id = r.id;

    -- Referral bonus: same qty to sender if claimed within 7 days.
    IF (now() - r.created_at) <= v_bonus_window THEN
      INSERT INTO public.ticket_transactions (user_id, amount, reason, ref_id)
      VALUES (r.sender_id, r.quantity, 'referral_bonus', r.sender_tx_id);

      UPDATE public.pending_gifts
         SET referral_bonus_paid_at = now()
       WHERE id = r.id;
    END IF;

    v_claimed := v_claimed + r.quantity;
  END LOOP;

  RETURN v_claimed;
END;
$$;

COMMENT ON FUNCTION public.claim_pending_gifts_for_profile IS
  'Converts unexpired pending_gifts into gift_received rows. If claimed within 7 days of original gift, also credits the sender a matching referral_bonus. Idempotent.';
