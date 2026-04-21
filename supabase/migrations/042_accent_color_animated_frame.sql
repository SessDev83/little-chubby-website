-- ══════════════════════════════════════════════════════════════
-- 042: Profile customization — accent color + animated frame
-- ──────────────────────────────────────────────────────────────
-- Phase D, section 5.3: two new Tier 2 cosmetic options.
--
--   * profiles.accent_color (allowlist: gold/coral/teal/violet/
--     rose/sage). XSS-safe: backend writes only one of 6 known
--     tokens; frontend maps each token to a CSS var (no inline
--     reflection of user input). (D-R6)
--   * profile_badges.badge_type extended to allow 'frame_animated'
--     which replaces the static frame visually (animation gated
--     on prefers-reduced-motion + min-width client-side). (D-R1)
--
-- Also:
--   * New RPC purchase_accent_color(p_user_id, p_color, p_cost)
--     uses advisory lock + balance check; inserts a
--     credit_transactions row with reason 'badge' (we re-use the
--     existing bucket for all cosmetic purchases to avoid another
--     CHECK migration). The accent is stored directly on profiles.
--   * purchase_badge() already handles badge inserts including
--     the new 'frame_animated' type via the extended CHECK.
-- ══════════════════════════════════════════════════════════════

-- ─── 1. Accent color column with allowlist CHECK (D-R6) ───────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS accent_color text NULL;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_accent_color_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_accent_color_check
  CHECK (accent_color IS NULL OR accent_color IN (
    'gold', 'coral', 'teal', 'violet', 'rose', 'sage'
  ));

COMMENT ON COLUMN public.profiles.accent_color IS
  'Optional brand-safe accent token. Allowlisted set — never reflected as raw CSS; frontend maps token to var.';

-- ─── 2. Extend profile_badges.badge_type to allow frame_animated
ALTER TABLE public.profile_badges
  DROP CONSTRAINT IF EXISTS profile_badges_badge_type_check;

ALTER TABLE public.profile_badges
  ADD CONSTRAINT profile_badges_badge_type_check
  CHECK (
    badge_type IN (
      'frame_gold', 'frame_silver', 'frame_animated',
      'top_reviewer', 'star_parent',
      'milestone_50', 'milestone_100', 'milestone_250',
      'milestone_500', 'milestone_1000'
    )
    OR badge_type ~ '^top_earner_[0-9]{4}_(0[1-9]|1[0-2])$'
  ) NOT VALID;

ALTER TABLE public.profile_badges
  VALIDATE CONSTRAINT profile_badges_badge_type_check;

-- ─── 3. RPC: purchase_accent_color ────────────────────────────
CREATE OR REPLACE FUNCTION public.purchase_accent_color(
  p_user_id uuid,
  p_color   text,
  p_cost    int
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_balance int;
BEGIN
  IF p_color NOT IN ('gold','coral','teal','violet','rose','sage') THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_color');
  END IF;
  IF p_cost IS NULL OR p_cost < 0 OR p_cost > 1000 THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_cost');
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('credits_' || p_user_id::text));

  SELECT COALESCE(SUM(amount), 0)::int INTO v_balance
  FROM public.credit_transactions
  WHERE user_id = p_user_id;

  IF v_balance < p_cost THEN
    RETURN jsonb_build_object(
      'success', false,
      'error',   'insufficient_credits',
      'balance', v_balance,
      'needed',  p_cost
    );
  END IF;

  UPDATE public.profiles
  SET accent_color = p_color
  WHERE id = p_user_id;

  INSERT INTO public.credit_transactions (user_id, amount, reason, ref_id)
  VALUES (p_user_id, -p_cost, 'badge', NULL);

  RETURN jsonb_build_object(
    'success', true,
    'color',   p_color,
    'balance', v_balance - p_cost
  );
END;
$$;

COMMENT ON FUNCTION public.purchase_accent_color IS
  'Deducts p_cost peanuts (reason=''badge'') and sets profiles.accent_color to one of 6 allowlisted tokens.';

REVOKE ALL ON FUNCTION public.purchase_accent_color(uuid, text, int) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.purchase_accent_color(uuid, text, int) TO authenticated;
