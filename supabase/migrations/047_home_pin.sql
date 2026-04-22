-- Migration 047: Home-page pin (Phase E.2 — 25 🥜, 3 days)
-- A user buys a pin so their approved review appears on the home page
-- "community spotlight" strip. Distinct from gallery-highlight (mig 039)
-- which promotes a photo inside /gallery/ — this one promotes a review's
-- text + book cover on the home page.

-- ─── 1. Table ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.home_pins (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  review_id  uuid NOT NULL REFERENCES public.book_reviews(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_home_pins_active
  ON public.home_pins (expires_at DESC);

CREATE INDEX IF NOT EXISTS idx_home_pins_user
  ON public.home_pins (user_id, expires_at DESC);

-- ─── 2. RLS: public read of currently active pins only ────────
ALTER TABLE public.home_pins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Active home pins are public" ON public.home_pins;
CREATE POLICY "Active home pins are public"
  ON public.home_pins FOR SELECT
  TO anon, authenticated
  USING (expires_at > now());

-- Owners can see their own (expired or not) to inspect history.
DROP POLICY IF EXISTS "Owner can read own pins" ON public.home_pins;
CREATE POLICY "Owner can read own pins"
  ON public.home_pins FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- ─── 3. Safety trigger: at most 1 active pin per user ─────────
CREATE OR REPLACE FUNCTION public.trg_enforce_single_active_home_pin()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.expires_at > now() THEN
    IF EXISTS (
      SELECT 1 FROM public.home_pins
      WHERE user_id = NEW.user_id
        AND expires_at > now()
        AND id <> NEW.id
    ) THEN
      RAISE EXCEPTION 'home_pin_active_on_other'
        USING ERRCODE = '23505';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_home_pins_single_active ON public.home_pins;
CREATE TRIGGER trg_home_pins_single_active
BEFORE INSERT OR UPDATE ON public.home_pins
FOR EACH ROW
EXECUTE FUNCTION public.trg_enforce_single_active_home_pin();

-- ─── 4. purchase_home_pin RPC ─────────────────────────────────
CREATE OR REPLACE FUNCTION public.purchase_home_pin(
  p_user_id        uuid,
  p_review_id      uuid,
  p_cost           int DEFAULT 25,
  p_duration_days  int DEFAULT 3
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_balance            int;
  v_existing_id        uuid;
  v_existing_review    uuid;
  v_existing_expires   timestamptz;
  v_new_expires        timestamptz;
  v_pin_id             uuid;
  v_review_owner       uuid;
  v_extended           boolean := false;
BEGIN
  IF p_cost IS NULL OR p_cost <= 0 OR p_cost > 200 THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_cost');
  END IF;
  IF p_duration_days IS NULL OR p_duration_days <= 0 OR p_duration_days > 14 THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_duration');
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('credits_' || p_user_id::text));

  -- Review must exist, be approved, and belong to the buyer.
  SELECT user_id INTO v_review_owner
  FROM public.book_reviews
  WHERE id = p_review_id AND status = 'approved';

  IF v_review_owner IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'review_not_found');
  END IF;
  IF v_review_owner <> p_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_review_owner');
  END IF;

  -- Balance check.
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

  -- Look for any active pin for this user.
  SELECT id, review_id, expires_at
    INTO v_existing_id, v_existing_review, v_existing_expires
  FROM public.home_pins
  WHERE user_id = p_user_id AND expires_at > now()
  ORDER BY expires_at DESC
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    IF v_existing_review <> p_review_id THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'home_pin_active_on_other',
        'active_review_id', v_existing_review,
        'expires_at', v_existing_expires
      );
    END IF;
    -- Same review → extend.
    v_new_expires := v_existing_expires + (p_duration_days || ' days')::interval;
    UPDATE public.home_pins
       SET expires_at = v_new_expires
     WHERE id = v_existing_id;
    v_pin_id := v_existing_id;
    v_extended := true;
  ELSE
    v_new_expires := now() + (p_duration_days || ' days')::interval;
    INSERT INTO public.home_pins (user_id, review_id, expires_at)
    VALUES (p_user_id, p_review_id, v_new_expires)
    RETURNING id INTO v_pin_id;
  END IF;

  INSERT INTO public.credit_transactions (user_id, amount, reason, ref_id)
  VALUES (p_user_id, -p_cost, 'boost', v_pin_id);

  RETURN jsonb_build_object(
    'success',    true,
    'pin_id',     v_pin_id,
    'expires_at', v_new_expires,
    'balance',    v_balance - p_cost,
    'extended',   v_extended
  );
END;
$$;

COMMENT ON FUNCTION public.purchase_home_pin IS
  'Phase E.2: pin a review to the home page community strip. 25 credits / 3 days, max 1 active per user.';

REVOKE ALL ON FUNCTION public.purchase_home_pin(uuid, uuid, int, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.purchase_home_pin(uuid, uuid, int, int) TO authenticated, service_role;
