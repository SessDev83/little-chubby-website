-- ══════════════════════════════════════════════════════════════
-- 034: Daily login streak (Phase C — gamification)
-- ──────────────────────────────────────────────────────────────
-- Tracks a per-user daily streak that increments when the user
-- visits on consecutive UTC days. touch_streak() is idempotent
-- within a day (multiple calls same day = no-op besides returning
-- current values) and is wrapped in an advisory lock to prevent
-- double-increment from concurrent requests (C-R1).
-- ══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.user_streaks (
  user_id          uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  last_visit_date  date NOT NULL,
  current_streak   int  NOT NULL DEFAULT 1,
  longest_streak   int  NOT NULL DEFAULT 1,
  updated_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_streaks_current_streak_positive CHECK (current_streak >= 0),
  CONSTRAINT user_streaks_longest_streak_positive CHECK (longest_streak >= 0)
);

ALTER TABLE public.user_streaks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_streaks_self_read" ON public.user_streaks;
CREATE POLICY "user_streaks_self_read"
  ON public.user_streaks FOR SELECT
  USING (auth.uid() = user_id);

-- No self-write policy: the RPC (SECURITY DEFINER) is the only writer.

-- ─── RPC: touch_streak(p_user_id) ─────────────────────────────
-- Returns jsonb: { current_streak, longest_streak, last_visit_date,
--                  incremented_today: bool }
-- Safe to call on every page view.
CREATE OR REPLACE FUNCTION public.touch_streak(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_today         date := (now() at time zone 'utc')::date;
  v_existing      public.user_streaks%ROWTYPE;
  v_current       int;
  v_longest       int;
  v_last          date;
  v_incremented   boolean := false;
BEGIN
  -- Advisory lock per user to prevent concurrent double-increment
  PERFORM pg_advisory_xact_lock(hashtext('streak_' || p_user_id::text));

  SELECT * INTO v_existing FROM public.user_streaks WHERE user_id = p_user_id;

  IF NOT FOUND THEN
    INSERT INTO public.user_streaks (user_id, last_visit_date, current_streak, longest_streak)
    VALUES (p_user_id, v_today, 1, 1)
    RETURNING current_streak, longest_streak, last_visit_date
          INTO v_current, v_longest, v_last;
    v_incremented := true;
  ELSE
    IF v_existing.last_visit_date = v_today THEN
      -- Same day: no change
      v_current := v_existing.current_streak;
      v_longest := v_existing.longest_streak;
      v_last    := v_existing.last_visit_date;
    ELSIF v_existing.last_visit_date = v_today - INTERVAL '1 day' THEN
      -- Consecutive day: increment
      v_current := v_existing.current_streak + 1;
      v_longest := GREATEST(v_existing.longest_streak, v_current);
      v_last    := v_today;
      v_incremented := true;
      UPDATE public.user_streaks
         SET current_streak = v_current,
             longest_streak = v_longest,
             last_visit_date = v_last,
             updated_at = now()
       WHERE user_id = p_user_id;
    ELSE
      -- Gap: reset to 1
      v_current := 1;
      v_longest := v_existing.longest_streak; -- preserve historical best
      v_last    := v_today;
      v_incremented := true;
      UPDATE public.user_streaks
         SET current_streak = v_current,
             longest_streak = v_longest,
             last_visit_date = v_last,
             updated_at = now()
       WHERE user_id = p_user_id;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'current_streak',   v_current,
    'longest_streak',   v_longest,
    'last_visit_date',  v_last,
    'incremented_today', v_incremented
  );
END;
$$;

COMMENT ON FUNCTION public.touch_streak IS
  'Records a daily visit for a user and returns current/longest streak. Idempotent within a UTC day. Safe to call on every page view.';

-- ─── RPC: get_streak(p_user_id) ─── read-only convenience ────
CREATE OR REPLACE FUNCTION public.get_streak(p_user_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT COALESCE(
    jsonb_build_object(
      'current_streak',  s.current_streak,
      'longest_streak',  s.longest_streak,
      'last_visit_date', s.last_visit_date
    ),
    jsonb_build_object(
      'current_streak', 0,
      'longest_streak', 0,
      'last_visit_date', NULL
    )
  )
  FROM public.user_streaks s
  WHERE s.user_id = p_user_id;
$$;

COMMENT ON FUNCTION public.get_streak IS
  'Read-only streak summary for the given user. Returns zeros if user has never visited.';
