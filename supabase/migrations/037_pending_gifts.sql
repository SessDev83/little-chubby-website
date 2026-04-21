-- ══════════════════════════════════════════════════════════════
-- 037: Pending gifts for recipients without an account
-- ──────────────────────────────────────────────────────────────
-- When a user gifts tickets to an email that does NOT yet belong
-- to a registered profile, the tickets are:
--   1. Immediately deducted from the sender (gift_sent_pending).
--   2. Stored in public.pending_gifts with a unique token.
--   3. Auto-claimed when a profile is later created for that email
--      (via AFTER INSERT trigger on public.profiles).
--   4. Refunded to the sender if still unclaimed after 30 days
--      (RPC refund_expired_pending_gifts, called by cron).
--
-- Master-plan risk refs: C-R8 (no double-charge), C-R9 (rate limit),
-- C-R10 (self-gift blocked), C-R12 (distinct reasons).
-- ══════════════════════════════════════════════════════════════

-- ─── 1. pending_gifts table ─────────────────────────────────
CREATE TABLE IF NOT EXISTS public.pending_gifts (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id        uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  recipient_email  text NOT NULL,
  recipient_email_norm text GENERATED ALWAYS AS (lower(trim(recipient_email))) STORED,
  quantity         int  NOT NULL CHECK (quantity BETWEEN 1 AND 5),
  token            text NOT NULL UNIQUE,
  created_at       timestamptz NOT NULL DEFAULT now(),
  expires_at       timestamptz NOT NULL,
  claimed_at       timestamptz,
  refunded_at      timestamptz,
  claimed_by       uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  sender_tx_id     uuid,            -- the gift_sent_pending ticket_transactions row
  CHECK (claimed_at IS NULL OR refunded_at IS NULL)
);

CREATE INDEX IF NOT EXISTS idx_pending_gifts_email ON public.pending_gifts (recipient_email_norm)
  WHERE claimed_at IS NULL AND refunded_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_pending_gifts_expires ON public.pending_gifts (expires_at)
  WHERE claimed_at IS NULL AND refunded_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_pending_gifts_sender ON public.pending_gifts (sender_id);

ALTER TABLE public.pending_gifts ENABLE ROW LEVEL SECURITY;

-- Sender can read their own pending gifts.
CREATE POLICY pending_gifts_sender_read
  ON public.pending_gifts FOR SELECT
  USING (auth.uid() = sender_id);

-- ─── 2. Extend ticket_transactions.reason ───────────────────
ALTER TABLE public.ticket_transactions
  DROP CONSTRAINT IF EXISTS ticket_transactions_reason_check;

ALTER TABLE public.ticket_transactions
  ADD CONSTRAINT ticket_transactions_reason_check
  CHECK (reason IN (
    'review_reward', 'peanut_purchase', 'giveaway_entry', 'admin',
    'gift_sent', 'gift_received',
    'gift_sent_pending', 'gift_refund'
  )) NOT VALID;

ALTER TABLE public.ticket_transactions
  VALIDATE CONSTRAINT ticket_transactions_reason_check;

-- ─── 3. Replace gift_tickets to support pending path ────────
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
  v_token text;
  v_expires timestamptz;
BEGIN
  IF p_quantity IS NULL OR p_quantity < 1 OR p_quantity > 5 THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_quantity');
  END IF;

  v_email_norm := lower(trim(coalesce(p_recipient_email, '')));
  IF v_email_norm = '' OR position('@' in v_email_norm) < 2 THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_email');
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('gift_' || p_sender_id::text));

  -- Rate limit: 3 gifts per UTC day (includes both direct + pending).
  SELECT COUNT(*) INTO v_gifts_today
  FROM public.ticket_transactions
  WHERE user_id = p_sender_id
    AND reason IN ('gift_sent', 'gift_sent_pending')
    AND created_at >= ((now() at time zone 'utc')::date)::timestamptz;

  IF v_gifts_today >= 3 THEN
    RETURN jsonb_build_object('success', false, 'error', 'rate_limit', 'limit', 3);
  END IF;

  -- Check sender balance first.
  SELECT COALESCE(SUM(amount), 0) INTO v_sender_balance
  FROM public.ticket_transactions
  WHERE user_id = p_sender_id;

  IF v_sender_balance < p_quantity THEN
    RETURN jsonb_build_object(
      'success', false, 'error', 'insufficient_tickets',
      'balance', v_sender_balance
    );
  END IF;

  -- Check if a profile already exists with this email.
  SELECT id, email INTO v_recipient_id, v_recipient_email
  FROM public.profiles
  WHERE lower(email) = v_email_norm
  LIMIT 1;

  -- Self-gift blocked for both direct and pending paths.
  IF v_recipient_id = p_sender_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'self_gift_not_allowed');
  END IF;

  -- Additional guard: sender's own email as pending target.
  IF v_recipient_id IS NULL THEN
    IF EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = p_sender_id AND lower(email) = v_email_norm
    ) THEN
      RETURN jsonb_build_object('success', false, 'error', 'self_gift_not_allowed');
    END IF;
  END IF;

  IF v_recipient_id IS NOT NULL THEN
    -- ── Direct gift: recipient already registered ──
    INSERT INTO public.ticket_transactions (user_id, amount, reason, ref_id)
    VALUES (p_sender_id, -p_quantity, 'gift_sent', v_recipient_id)
    RETURNING id INTO v_sender_tx_id;

    INSERT INTO public.ticket_transactions (user_id, amount, reason, ref_id)
    VALUES (v_recipient_id, p_quantity, 'gift_received', v_sender_tx_id);

    RETURN jsonb_build_object(
      'success', true, 'pending', false,
      'quantity', p_quantity,
      'sender_balance', v_sender_balance - p_quantity,
      'recipient_email', v_recipient_email
    );
  ELSE
    -- ── Pending gift: stash for later claim ──
    v_token := encode(gen_random_bytes(24), 'base64');
    -- Make token URL-safe (replace + / and strip padding).
    v_token := translate(v_token, '+/', '-_');
    v_token := replace(v_token, '=', '');
    v_expires := now() + interval '30 days';

    INSERT INTO public.ticket_transactions (user_id, amount, reason)
    VALUES (p_sender_id, -p_quantity, 'gift_sent_pending')
    RETURNING id INTO v_sender_tx_id;

    INSERT INTO public.pending_gifts (
      sender_id, recipient_email, quantity, token, expires_at, sender_tx_id
    )
    VALUES (p_sender_id, v_email_norm, p_quantity, v_token, v_expires, v_sender_tx_id);

    RETURN jsonb_build_object(
      'success', true, 'pending', true,
      'quantity', p_quantity,
      'sender_balance', v_sender_balance - p_quantity,
      'recipient_email', v_email_norm,
      'token', v_token,
      'expires_at', v_expires
    );
  END IF;
END;
$$;

-- ─── 4. Claim pending gifts for a newly created profile ─────
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
  r record;
BEGIN
  SELECT email INTO v_email FROM public.profiles WHERE id = p_user_id;
  IF v_email IS NULL THEN
    RETURN 0;
  END IF;
  v_email_norm := lower(trim(v_email));

  PERFORM pg_advisory_xact_lock(hashtext('claim_' || p_user_id::text));

  FOR r IN
    SELECT id, sender_id, quantity, sender_tx_id
    FROM public.pending_gifts
    WHERE recipient_email_norm = v_email_norm
      AND claimed_at IS NULL
      AND refunded_at IS NULL
      AND expires_at > now()
    FOR UPDATE
  LOOP
    INSERT INTO public.ticket_transactions (user_id, amount, reason, ref_id)
    VALUES (p_user_id, r.quantity, 'gift_received', r.sender_tx_id);

    UPDATE public.pending_gifts
       SET claimed_at = now(), claimed_by = p_user_id
     WHERE id = r.id;

    v_claimed := v_claimed + r.quantity;
  END LOOP;

  RETURN v_claimed;
END;
$$;

COMMENT ON FUNCTION public.claim_pending_gifts_for_profile IS
  'Converts any unexpired pending_gifts matching the user''s email into gift_received ticket rows. Idempotent.';

-- ─── 5. AFTER INSERT trigger on profiles → auto-claim ───────
CREATE OR REPLACE FUNCTION public.trg_auto_claim_pending_gifts()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  BEGIN
    PERFORM public.claim_pending_gifts_for_profile(NEW.id);
  EXCEPTION WHEN OTHERS THEN
    -- Never fail profile creation because of gift claim.
    NULL;
  END;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_auto_claim_gifts ON public.profiles;

CREATE TRIGGER trg_profiles_auto_claim_gifts
AFTER INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.trg_auto_claim_pending_gifts();

-- ─── 6. Refund expired pending gifts (cron) ─────────────────
CREATE OR REPLACE FUNCTION public.refund_expired_pending_gifts()
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_refunded int := 0;
  r record;
BEGIN
  FOR r IN
    SELECT id, sender_id, quantity, sender_tx_id
    FROM public.pending_gifts
    WHERE claimed_at IS NULL
      AND refunded_at IS NULL
      AND expires_at <= now()
    FOR UPDATE
  LOOP
    INSERT INTO public.ticket_transactions (user_id, amount, reason, ref_id)
    VALUES (r.sender_id, r.quantity, 'gift_refund', r.sender_tx_id);

    UPDATE public.pending_gifts
       SET refunded_at = now()
     WHERE id = r.id;

    v_refunded := v_refunded + 1;
  END LOOP;

  RETURN v_refunded;
END;
$$;
