-- Migration 048: Social shoutout orders (Phase E.1)
-- Users spend peanuts to request their approved review be featured on
-- Little Chubby's social channels. Admin reviews and publishes manually.

CREATE TABLE IF NOT EXISTS public.shoutout_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  review_id uuid NOT NULL REFERENCES public.book_reviews(id) ON DELETE CASCADE,
  cost integer NOT NULL CHECK (cost BETWEEN 1 AND 200),
  status text NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued','approved','published','rejected','refunded')),
  admin_note text,
  published_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  published_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_shoutout_orders_status
  ON public.shoutout_orders (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_shoutout_orders_user
  ON public.shoutout_orders (user_id, created_at DESC);

-- Prevent duplicate queued/approved orders for the same review.
CREATE UNIQUE INDEX IF NOT EXISTS uq_shoutout_active_per_review
  ON public.shoutout_orders (review_id)
  WHERE status IN ('queued','approved');

ALTER TABLE public.shoutout_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owner can read own shoutout orders" ON public.shoutout_orders;
CREATE POLICY "Owner can read own shoutout orders"
  ON public.shoutout_orders
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Published shoutouts are public" ON public.shoutout_orders;
CREATE POLICY "Published shoutouts are public"
  ON public.shoutout_orders
  FOR SELECT
  TO anon, authenticated
  USING (status = 'published' AND published_url IS NOT NULL);

-- ───────────────────────────────────────────────────────────────
-- RPC: purchase_shoutout
-- Buyer spends peanuts, insert a queued order.
-- Returns jsonb: { ok: true, order_id, cost } OR { error: '...' }
-- Errors: insufficient_credits, review_not_found, not_review_owner,
--         active_shoutout_exists, invalid_cost
-- ───────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.purchase_shoutout(
  p_user_id uuid,
  p_review_id uuid,
  p_cost integer DEFAULT 30
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_balance integer;
  v_review_owner uuid;
  v_review_status text;
  v_existing uuid;
  v_order_id uuid;
BEGIN
  IF p_cost IS NULL OR p_cost < 1 OR p_cost > 200 THEN
    RETURN jsonb_build_object('error', 'invalid_cost');
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('credits_' || p_user_id::text));

  SELECT user_id, status
    INTO v_review_owner, v_review_status
  FROM public.book_reviews
  WHERE id = p_review_id;

  IF v_review_owner IS NULL THEN
    RETURN jsonb_build_object('error', 'review_not_found');
  END IF;

  IF v_review_owner <> p_user_id OR v_review_status <> 'approved' THEN
    RETURN jsonb_build_object('error', 'not_review_owner');
  END IF;

  SELECT id INTO v_existing
  FROM public.shoutout_orders
  WHERE review_id = p_review_id
    AND status IN ('queued','approved')
  LIMIT 1;

  IF v_existing IS NOT NULL THEN
    RETURN jsonb_build_object('error', 'active_shoutout_exists');
  END IF;

  SELECT peanuts INTO v_balance FROM public.profiles WHERE id = p_user_id FOR UPDATE;
  IF v_balance IS NULL OR v_balance < p_cost THEN
    RETURN jsonb_build_object('error', 'insufficient_credits');
  END IF;

  INSERT INTO public.shoutout_orders (user_id, review_id, cost, status)
  VALUES (p_user_id, p_review_id, p_cost, 'queued')
  RETURNING id INTO v_order_id;

  UPDATE public.profiles
     SET peanuts = peanuts - p_cost
   WHERE id = p_user_id;

  INSERT INTO public.credit_transactions (user_id, amount, reason, ref_id)
  VALUES (p_user_id, -p_cost, 'boost', v_order_id);

  RETURN jsonb_build_object('ok', true, 'order_id', v_order_id, 'cost', p_cost);
END;
$$;

REVOKE ALL ON FUNCTION public.purchase_shoutout(uuid, uuid, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.purchase_shoutout(uuid, uuid, integer) TO authenticated, service_role;

-- ───────────────────────────────────────────────────────────────
-- RPC: refund_shoutout (admin-only, service_role)
-- Refunds the cost and marks order as 'refunded'. Idempotent.
-- Returns { ok: true } OR { error }
-- ───────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.refund_shoutout(
  p_order_id uuid,
  p_admin_note text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid;
  v_cost integer;
  v_status text;
BEGIN
  SELECT user_id, cost, status
    INTO v_user_id, v_cost, v_status
  FROM public.shoutout_orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('error', 'order_not_found');
  END IF;

  IF v_status = 'refunded' THEN
    RETURN jsonb_build_object('ok', true, 'already_refunded', true);
  END IF;

  IF v_status = 'published' THEN
    RETURN jsonb_build_object('error', 'already_published');
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('credits_' || v_user_id::text));

  UPDATE public.profiles
     SET peanuts = peanuts + v_cost
   WHERE id = v_user_id;

  INSERT INTO public.credit_transactions (user_id, amount, reason, ref_id)
  VALUES (v_user_id, v_cost, 'reversal', p_order_id);

  UPDATE public.shoutout_orders
     SET status = 'refunded',
         admin_note = COALESCE(p_admin_note, admin_note),
         reviewed_at = COALESCE(reviewed_at, now())
   WHERE id = p_order_id;

  RETURN jsonb_build_object('ok', true);
END;
$$;

REVOKE ALL ON FUNCTION public.refund_shoutout(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.refund_shoutout(uuid, text) TO service_role;

COMMENT ON TABLE public.shoutout_orders IS
  'E.1: social shoutout orders. User spends peanuts, admin approves/publishes manually.';
