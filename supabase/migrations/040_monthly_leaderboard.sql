-- ══════════════════════════════════════════════════════════════
-- 040: Monthly leaderboard + public visibility opt-in
-- ──────────────────────────────────────────────────────────────
-- Strict opt-in (C-R13, C-R7): column defaults to FALSE on the
-- profiles table. The materialized view filters rows BY THE
-- COLUMN INSIDE the view SQL (never relies on RLS at refresh).
--
-- Shows: top 5 users by peanuts EARNED (positive credits) in the
-- current calendar month, limited to users who opted in. Excludes
-- admin grants (reason='admin') so the board rewards organic
-- activity only.
-- ══════════════════════════════════════════════════════════════

-- ─── 1. Opt-in column on profiles ──────────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS show_in_leaderboards boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.profiles.show_in_leaderboards IS
  'Strict opt-in: false by default. When true, user appears by name on /peanuts/ monthly leaderboard.';

-- ─── 2. Materialized view: monthly_leaderboard ────────────────
-- Always reflects the CURRENT calendar month (UTC). Refresh via
-- cron or trigger as needed. Opt-outs are filtered INSIDE the
-- view, so refresh never leaks them.
DROP MATERIALIZED VIEW IF EXISTS public.monthly_leaderboard;

CREATE MATERIALIZED VIEW public.monthly_leaderboard AS
WITH month_bounds AS (
  SELECT
    date_trunc('month', (now() AT TIME ZONE 'utc'))::timestamptz AS start_ts,
    (date_trunc('month', (now() AT TIME ZONE 'utc')) + interval '1 month')::timestamptz AS end_ts
),
earners AS (
  SELECT
    ct.user_id,
    SUM(ct.amount)::int AS peanuts_earned
  FROM public.credit_transactions ct, month_bounds mb
  WHERE ct.amount > 0
    AND ct.reason <> 'admin'
    AND ct.created_at >= mb.start_ts
    AND ct.created_at <  mb.end_ts
  GROUP BY ct.user_id
)
SELECT
  ROW_NUMBER() OVER (ORDER BY e.peanuts_earned DESC, p.created_at ASC) AS rank,
  p.id AS user_id,
  p.display_name,
  e.peanuts_earned,
  (SELECT start_ts FROM month_bounds) AS month_start,
  (SELECT end_ts   FROM month_bounds) AS month_end
FROM earners e
JOIN public.profiles p ON p.id = e.user_id
WHERE p.show_in_leaderboards = true
ORDER BY peanuts_earned DESC
LIMIT 5;

CREATE UNIQUE INDEX IF NOT EXISTS idx_monthly_leaderboard_rank
  ON public.monthly_leaderboard (rank);

COMMENT ON MATERIALIZED VIEW public.monthly_leaderboard IS
  'Top 5 opted-in users by peanuts earned in the current UTC calendar month. Refresh via refresh_monthly_leaderboard().';

-- ─── 3. Safe REFRESH function ─────────────────────────────────
CREATE OR REPLACE FUNCTION public.refresh_monthly_leaderboard()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.monthly_leaderboard;
EXCEPTION
  -- CONCURRENTLY requires a populated view; fall back on first run.
  WHEN feature_not_supported OR object_not_in_prerequisite_state THEN
    REFRESH MATERIALIZED VIEW public.monthly_leaderboard;
END;
$$;

COMMENT ON FUNCTION public.refresh_monthly_leaderboard IS
  'Refreshes public.monthly_leaderboard. Safe to call from cron; uses CONCURRENTLY when possible.';

-- ─── 4. Grants — public read on the view only ─────────────────
GRANT SELECT ON public.monthly_leaderboard TO anon, authenticated;

-- Seed a first non-concurrent refresh so the unique index is valid.
REFRESH MATERIALIZED VIEW public.monthly_leaderboard;
