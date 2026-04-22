-- ══════════════════════════════════════════════════════════════
-- 050: Featured badge (Phase F — visibility loop)
-- ──────────────────────────────────────────────────────────────
-- Adds profiles.featured_badge: the single badge a user wants
-- shown publicly next to their display_name on community
-- surfaces (gallery, leaderboard, home pins, shoutouts).
--
-- Writer (RPC set_featured_badge) enforces the user actually
-- owns the badge at the time of setting. NULL clears it.
--
-- Safe additive migration:
--   * Column is nullable, no default required.
--   * No existing columns altered.
--   * No existing RLS policies touched.
-- ══════════════════════════════════════════════════════════════

-- ─── 1. Column ────────────────────────────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS featured_badge text NULL;

COMMENT ON COLUMN public.profiles.featured_badge IS
  'Badge the user has chosen to display publicly. Must match a row in profile_badges (user_id, badge_type) that is active and not expired. NULL = none.';

-- ─── 2. Index (leaderboard/gallery surfaces read this per user) ─
-- Not strictly necessary (profiles.id is PK, lookups are by id)
-- but a partial idx lets us quickly count users featuring a
-- given badge for future analytics.
CREATE INDEX IF NOT EXISTS profiles_featured_badge_idx
  ON public.profiles (featured_badge)
  WHERE featured_badge IS NOT NULL;

-- ─── 3. RPC: set_featured_badge ───────────────────────────────
-- Clears (p_badge_type = NULL) or sets (must be owned + active).
CREATE OR REPLACE FUNCTION public.set_featured_badge(
  p_user_id    uuid,
  p_badge_type text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_owned boolean;
BEGIN
  -- Clear case
  IF p_badge_type IS NULL OR length(btrim(p_badge_type)) = 0 THEN
    UPDATE public.profiles
      SET featured_badge = NULL
      WHERE id = p_user_id;
    RETURN jsonb_build_object('success', true, 'featured_badge', NULL);
  END IF;

  -- Defensive length guard (badge_type values are short ids).
  IF length(p_badge_type) > 64 THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_badge');
  END IF;

  -- Ownership + active + non-expired check.
  SELECT EXISTS (
    SELECT 1
      FROM public.profile_badges pb
     WHERE pb.user_id = p_user_id
       AND pb.badge_type = p_badge_type
       AND pb.active = true
       AND (pb.expires_at IS NULL OR pb.expires_at > now())
  ) INTO v_owned;

  IF NOT v_owned THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_owned');
  END IF;

  UPDATE public.profiles
    SET featured_badge = p_badge_type
    WHERE id = p_user_id;

  RETURN jsonb_build_object('success', true, 'featured_badge', p_badge_type);
END;
$$;

COMMENT ON FUNCTION public.set_featured_badge(uuid, text) IS
  'Sets profiles.featured_badge after verifying the caller actually owns that active, non-expired badge. Pass NULL to clear.';

REVOKE ALL ON FUNCTION public.set_featured_badge(uuid, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.set_featured_badge(uuid, text) TO authenticated;
