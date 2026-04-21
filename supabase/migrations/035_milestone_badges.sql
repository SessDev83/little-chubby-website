-- ══════════════════════════════════════════════════════════════
-- 035: Milestone auto-badges (Phase C — gamification)
-- ──────────────────────────────────────────────────────────────
-- Awards badges automatically when a user's lifetime positive
-- peanuts (sum of credit_transactions.amount > 0) crosses each
-- threshold: 50, 100, 250, 500, 1000.
--
-- Design decisions (from master plan §13.C-R3..C-R6):
--  * Extend CHECK constraint via DROP + ADD NOT VALID + VALIDATE
--    to avoid full-scan blocking writes on large tables.
--  * Trigger is AFTER INSERT and exception-safe: it never raises,
--    so purchase RPCs never roll back because of badge logic.
--  * Badges are "lifetime achievements" — once granted, they are
--    NOT revoked even if admin adjusts credits downward.
--  * Migration retroactively grants milestone badges to existing
--    users based on their current lifetime positive sum.
-- ══════════════════════════════════════════════════════════════

-- ─── 1. Extend badge_type CHECK constraint ──────────────────
ALTER TABLE public.profile_badges
  DROP CONSTRAINT IF EXISTS profile_badges_badge_type_check;

ALTER TABLE public.profile_badges
  ADD CONSTRAINT profile_badges_badge_type_check
  CHECK (badge_type IN (
    'frame_gold', 'frame_silver', 'top_reviewer', 'star_parent',
    'milestone_50', 'milestone_100', 'milestone_250',
    'milestone_500', 'milestone_1000'
  )) NOT VALID;

ALTER TABLE public.profile_badges
  VALIDATE CONSTRAINT profile_badges_badge_type_check;

-- ─── 2. Uniqueness: one of each milestone per user ──────────
-- (Idempotent grants rely on this.)
CREATE UNIQUE INDEX IF NOT EXISTS uniq_profile_badges_user_type
  ON public.profile_badges (user_id, badge_type);

-- ─── 3. Grant function (exception-safe, idempotent) ─────────
CREATE OR REPLACE FUNCTION public.grant_milestone_badges(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_total int;
BEGIN
  BEGIN
    SELECT COALESCE(SUM(amount), 0) INTO v_total
    FROM public.credit_transactions
    WHERE user_id = p_user_id AND amount > 0;

    -- Insert any milestone the user has earned; ON CONFLICT keeps idempotent.
    IF v_total >= 50 THEN
      INSERT INTO public.profile_badges (user_id, badge_type, active)
      VALUES (p_user_id, 'milestone_50', true)
      ON CONFLICT (user_id, badge_type) DO NOTHING;
    END IF;
    IF v_total >= 100 THEN
      INSERT INTO public.profile_badges (user_id, badge_type, active)
      VALUES (p_user_id, 'milestone_100', true)
      ON CONFLICT (user_id, badge_type) DO NOTHING;
    END IF;
    IF v_total >= 250 THEN
      INSERT INTO public.profile_badges (user_id, badge_type, active)
      VALUES (p_user_id, 'milestone_250', true)
      ON CONFLICT (user_id, badge_type) DO NOTHING;
    END IF;
    IF v_total >= 500 THEN
      INSERT INTO public.profile_badges (user_id, badge_type, active)
      VALUES (p_user_id, 'milestone_500', true)
      ON CONFLICT (user_id, badge_type) DO NOTHING;
    END IF;
    IF v_total >= 1000 THEN
      INSERT INTO public.profile_badges (user_id, badge_type, active)
      VALUES (p_user_id, 'milestone_1000', true)
      ON CONFLICT (user_id, badge_type) DO NOTHING;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    -- Never propagate: badge logic must not roll back purchases.
    NULL;
  END;
END;
$$;

COMMENT ON FUNCTION public.grant_milestone_badges IS
  'Awards any milestone_* badges the user has earned based on lifetime positive credits. Idempotent; exception-safe.';

-- ─── 4. AFTER INSERT trigger on credit_transactions ─────────
CREATE OR REPLACE FUNCTION public.trg_milestone_badges()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Only evaluate on positive credit rows (earning events).
  IF NEW.amount > 0 THEN
    PERFORM public.grant_milestone_badges(NEW.user_id);
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_credit_transactions_milestone ON public.credit_transactions;

CREATE TRIGGER trg_credit_transactions_milestone
AFTER INSERT ON public.credit_transactions
FOR EACH ROW
EXECUTE FUNCTION public.trg_milestone_badges();

-- ─── 5. Retroactive grant for existing users ────────────────
-- Runs once during migration. Uses DISTINCT user ids with positive credits.
DO $$
DECLARE
  u_id uuid;
BEGIN
  FOR u_id IN
    SELECT DISTINCT user_id
    FROM public.credit_transactions
    WHERE amount > 0
  LOOP
    PERFORM public.grant_milestone_badges(u_id);
  END LOOP;
END $$;
