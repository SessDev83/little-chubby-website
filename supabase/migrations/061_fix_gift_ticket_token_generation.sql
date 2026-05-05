-- Migration 061: Fix pending gift token generation under an empty search_path.
-- The gift_tickets RPC is SECURITY DEFINER with SET search_path = ''.
-- Qualify gen_random_bytes so pending gifts do not fail with SQL 42883.

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

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
  v_email_norm text;
  v_sender_tx_id uuid;
  v_recipient_tx_id uuid;
  v_pending_id uuid;
  v_token text;
  v_expires timestamptz := now() + interval '30 days';
BEGIN
  IF p_quantity IS NULL OR p_quantity < 1 OR p_quantity > 5 THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_quantity');
  END IF;

  v_email_norm := lower(trim(coalesce(p_recipient_email, '')));
  IF v_email_norm = '' OR position('@' in v_email_norm) < 2 THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_email');
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('tickets_gift_' || p_sender_id::text));

  SELECT COUNT(*) INTO v_gifts_today
  FROM public.ticket_transactions
  WHERE user_id = p_sender_id
    AND reason IN ('gift_sent', 'gift_sent_pending')
    AND amount < 0
    AND created_at >= ((now() at time zone 'utc')::date)::timestamptz;

  IF v_gifts_today >= 3 THEN
    RETURN jsonb_build_object('success', false, 'error', 'rate_limit', 'limit', 3);
  END IF;

  SELECT id, email INTO v_recipient_id, v_recipient_email
  FROM public.profiles
  WHERE lower(email) = v_email_norm
  LIMIT 1;

  IF v_recipient_id IS NOT NULL AND v_recipient_id = p_sender_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'self_gift_not_allowed');
  END IF;

  IF v_recipient_id IS NULL AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = p_sender_id AND lower(email) = v_email_norm
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'self_gift_not_allowed');
  END IF;

  SELECT COALESCE(SUM(amount), 0) INTO v_sender_balance
  FROM public.ticket_transactions
  WHERE user_id = p_sender_id;

  IF v_sender_balance < p_quantity THEN
    RETURN jsonb_build_object('success', false, 'error', 'insufficient_tickets', 'balance', v_sender_balance);
  END IF;

  IF v_recipient_id IS NOT NULL THEN
    INSERT INTO public.ticket_transactions (user_id, amount, reason, ref_id)
    VALUES (p_sender_id, -p_quantity, 'gift_sent', v_recipient_id)
    RETURNING id INTO v_sender_tx_id;

    INSERT INTO public.ticket_transactions (user_id, amount, reason, ref_id)
    VALUES (v_recipient_id, p_quantity, 'gift_received', v_sender_tx_id)
    RETURNING id INTO v_recipient_tx_id;

    RETURN jsonb_build_object(
      'success', true,
      'pending', false,
      'quantity', p_quantity,
      'recipient_id', v_recipient_id,
      'recipient_email', v_recipient_email,
      'sender_balance', v_sender_balance - p_quantity,
      'sender_tx_id', v_sender_tx_id,
      'recipient_tx_id', v_recipient_tx_id
    );
  END IF;

  v_token := encode(extensions.gen_random_bytes(24), 'base64');
  v_token := replace(replace(replace(v_token, '+', '-'), '/', '_'), '=', '');

  INSERT INTO public.ticket_transactions (user_id, amount, reason, ref_id)
  VALUES (p_sender_id, -p_quantity, 'gift_sent_pending', NULL)
  RETURNING id INTO v_sender_tx_id;

  INSERT INTO public.pending_gifts (
    sender_id, recipient_email, quantity, token, expires_at, sender_tx_id
  )
  VALUES (p_sender_id, v_email_norm, p_quantity, v_token, v_expires, v_sender_tx_id)
  RETURNING id INTO v_pending_id;

  RETURN jsonb_build_object(
    'success', true,
    'pending', true,
    'quantity', p_quantity,
    'recipient_email', v_email_norm,
    'pending_gift_id', v_pending_id,
    'expires_at', v_expires,
    'sender_balance', v_sender_balance - p_quantity,
    'token', v_token
  );
END;
$$;

REVOKE ALL ON FUNCTION public.gift_tickets(uuid, text, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.gift_tickets(uuid, text, int) TO authenticated, service_role;

COMMENT ON FUNCTION public.gift_tickets(uuid, text, int) IS
  'Transfers tickets or creates a 30-day pending gift invite. Token generation qualifies extensions.gen_random_bytes for empty search_path safety.';