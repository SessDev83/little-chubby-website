-- Migration 049: Coloring multi-pack (premium download credits)
-- Users prepay 5 peanuts for 3 premium coloring downloads. Credits are
-- consumed one-by-one when downloading premium artworks (once premium
-- catalog launches). Reason 'premium_download' already in allowlist.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS premium_download_credits integer NOT NULL DEFAULT 0
    CHECK (premium_download_credits >= 0);

COMMENT ON COLUMN public.profiles.premium_download_credits IS
  'Prepaid credits for premium artwork downloads. Consumed per download.';

-- ───────────────────────────────────────────────────────────────
-- RPC: purchase_download_multipack
-- Buyer spends peanuts, receives N download credits (default 3 for 5 🥜).
-- Advisory lock + balance check + atomic swap.
-- Returns jsonb: { ok: true, credits, balance } OR { error: '...' }
-- Errors: insufficient_credits, invalid_cost, invalid_credits
-- ───────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.purchase_download_multipack(
  p_user_id uuid,
  p_cost integer DEFAULT 5,
  p_credits integer DEFAULT 3
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_balance integer;
  v_new_credits integer;
BEGIN
  IF p_cost IS NULL OR p_cost < 1 OR p_cost > 50 THEN
    RETURN jsonb_build_object('error', 'invalid_cost');
  END IF;

  IF p_credits IS NULL OR p_credits < 1 OR p_credits > 20 THEN
    RETURN jsonb_build_object('error', 'invalid_credits');
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('credits_' || p_user_id::text));

  SELECT peanuts INTO v_balance FROM public.profiles WHERE id = p_user_id FOR UPDATE;
  IF v_balance IS NULL OR v_balance < p_cost THEN
    RETURN jsonb_build_object('error', 'insufficient_credits');
  END IF;

  UPDATE public.profiles
     SET peanuts = peanuts - p_cost,
         premium_download_credits = premium_download_credits + p_credits
   WHERE id = p_user_id
   RETURNING premium_download_credits INTO v_new_credits;

  INSERT INTO public.credit_transactions (user_id, amount, reason, ref_id)
  VALUES (p_user_id, -p_cost, 'premium_download', NULL);

  RETURN jsonb_build_object(
    'ok', true,
    'credits', v_new_credits,
    'balance', v_balance - p_cost
  );
END;
$$;

REVOKE ALL ON FUNCTION public.purchase_download_multipack(uuid, integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.purchase_download_multipack(uuid, integer, integer) TO authenticated, service_role;
