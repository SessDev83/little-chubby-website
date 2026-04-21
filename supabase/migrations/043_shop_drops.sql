-- =============================================================
-- Migration 043: Limited-time shop drops (Phase D.4)
-- =============================================================
-- A curated table of seasonal / limited-edition badges that are only
-- purchasable during their active window. Purchases grant a regular
-- profile_badge whose type matches the drop (pattern drop_<slug>) so
-- the existing badge collection UI and "already_owned" logic apply.
--
-- Safety:
--   • Active-window check is performed server-side inside the RPC
--     (defense-in-depth; client also filters) — master plan D-R2.
--   • profile_badges.badge_type CHECK is extended to allow `drop_*`.
--   • Cost read from the row, not from the client.
--   • Advisory lock + balance check + ON CONFLICT DO NOTHING.
-- =============================================================

-- 1. Drops catalog --------------------------------------------------

CREATE TABLE IF NOT EXISTS public.shop_drops (
  id           text PRIMARY KEY,              -- slug, e.g. "winter_snowflake"
  badge_type   text NOT NULL UNIQUE            -- matches profile_badges.badge_type
                  CHECK (badge_type ~ '^drop_[a-z0-9_]+$'),
  label_es     text NOT NULL,
  label_en     text NOT NULL,
  desc_es      text,
  desc_en      text,
  icon         text NOT NULL DEFAULT '🎁',
  cost         integer NOT NULL CHECK (cost > 0 AND cost <= 1000),
  active_from  timestamptz NOT NULL,
  active_to    timestamptz NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  CHECK (active_to > active_from)
);

CREATE INDEX IF NOT EXISTS shop_drops_active_idx
  ON public.shop_drops (active_from, active_to);

ALTER TABLE public.shop_drops ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "shop_drops public read" ON public.shop_drops;
CREATE POLICY "shop_drops public read"
  ON public.shop_drops
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- 2. Extend profile_badges CHECK to allow drop_* ------------------

ALTER TABLE public.profile_badges
  DROP CONSTRAINT IF EXISTS profile_badges_badge_type_check;

ALTER TABLE public.profile_badges
  ADD CONSTRAINT profile_badges_badge_type_check
  CHECK (
    badge_type IN (
      'frame_gold','frame_silver','top_reviewer','star_parent',
      'milestone_50','milestone_100','milestone_250','milestone_500','milestone_1000',
      'frame_animated'
    )
    OR badge_type ~ '^top_earner_[0-9]{4}_(0[1-9]|1[0-2])$'
    OR badge_type ~ '^drop_[a-z0-9_]+$'
  ) NOT VALID;

ALTER TABLE public.profile_badges
  VALIDATE CONSTRAINT profile_badges_badge_type_check;

-- 3. RPC: purchase_drop -------------------------------------------

CREATE OR REPLACE FUNCTION public.purchase_drop(
  p_user_id uuid,
  p_drop_id text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_drop        public.shop_drops%ROWTYPE;
  v_balance     integer;
  v_now         timestamptz := now();
BEGIN
  IF p_user_id IS NULL OR p_drop_id IS NULL OR length(p_drop_id) = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_input');
  END IF;

  -- Serialize per user to avoid double-spend
  PERFORM pg_advisory_xact_lock(hashtext('credits_' || p_user_id::text));

  SELECT * INTO v_drop FROM public.shop_drops WHERE id = p_drop_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'drop_not_found');
  END IF;

  -- Server-side window enforcement (D-R2)
  IF v_now < v_drop.active_from OR v_now >= v_drop.active_to THEN
    RETURN jsonb_build_object('success', false, 'error', 'drop_inactive');
  END IF;

  -- Already owned?
  IF EXISTS (
    SELECT 1 FROM public.profile_badges
    WHERE user_id = p_user_id AND badge_type = v_drop.badge_type
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'already_owned');
  END IF;

  SELECT COALESCE(SUM(amount), 0)::int INTO v_balance
    FROM public.credit_transactions
    WHERE user_id = p_user_id;

  IF v_balance < v_drop.cost THEN
    RETURN jsonb_build_object(
      'success', false,
      'error',   'insufficient_credits',
      'balance', v_balance,
      'needed',  v_drop.cost
    );
  END IF;

  INSERT INTO public.profile_badges (user_id, badge_type, purchased_at)
    VALUES (p_user_id, v_drop.badge_type, v_now)
    ON CONFLICT (user_id, badge_type) DO NOTHING;

  INSERT INTO public.credit_transactions (user_id, amount, reason)
    VALUES (p_user_id, -v_drop.cost, 'badge');

  RETURN jsonb_build_object(
    'success', true,
    'badge_type', v_drop.badge_type,
    'balance', v_balance - v_drop.cost
  );
END;
$$;

REVOKE ALL ON FUNCTION public.purchase_drop(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.purchase_drop(uuid, text) TO authenticated;

-- 4. Seed a couple of sample drops (idempotent) -------------------
--    These are sample windows; admins can update/delete as needed.

INSERT INTO public.shop_drops (id, badge_type, label_es, label_en, desc_es, desc_en, icon, cost, active_from, active_to)
VALUES
  ('winter_snowflake', 'drop_winter_snowflake',
   'Copo de nieve invernal', 'Winter Snowflake',
   'Edición limitada de invierno. Solo en diciembre.',
   'Limited winter edition. December only.',
   '❄️', 25,
   '2025-12-01 00:00:00+00', '2026-01-01 00:00:00+00'),
  ('valentine_heart', 'drop_valentine_heart',
   'Corazón de San Valentín', 'Valentine Heart',
   'Edición San Valentín. Primera quincena de febrero.',
   'Valentine''s edition. First half of February.',
   '💘', 25,
   '2026-02-01 00:00:00+00', '2026-02-15 00:00:00+00'),
  ('summer_sun', 'drop_summer_sun',
   'Sol de verano', 'Summer Sun',
   'Edición verano. Junio a agosto.',
   'Summer edition. June through August.',
   '☀️', 25,
   '2026-06-01 00:00:00+00', '2026-09-01 00:00:00+00')
ON CONFLICT (id) DO NOTHING;
