-- ═══════════════════════════════════════════════════════════════════════════
-- Migration 058 — Pageview Geo + Visitor Local Time
--
-- Purpose:
--   1. Store coarse country from edge headers without saving raw IP addresses
--   2. Store visitor timezone/local hour for owner-friendly admin reporting
--   3. Keep all fields nullable so older pageview clients remain valid
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE public.pageviews
  ADD COLUMN IF NOT EXISTS timezone text,
  ADD COLUMN IF NOT EXISTS local_date date,
  ADD COLUMN IF NOT EXISTS local_hour smallint,
  ADD COLUMN IF NOT EXISTS local_weekday smallint;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'pageviews_local_hour_check'
  ) THEN
    ALTER TABLE public.pageviews
      ADD CONSTRAINT pageviews_local_hour_check
      CHECK (local_hour IS NULL OR (local_hour >= 0 AND local_hour <= 23));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'pageviews_local_weekday_check'
  ) THEN
    ALTER TABLE public.pageviews
      ADD CONSTRAINT pageviews_local_weekday_check
      CHECK (local_weekday IS NULL OR (local_weekday >= 0 AND local_weekday <= 6));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_pageviews_country_created_at
  ON public.pageviews (country, created_at DESC)
  WHERE country IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_pageviews_timezone_created_at
  ON public.pageviews (timezone, created_at DESC)
  WHERE timezone IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_pageviews_local_hour_created_at
  ON public.pageviews (local_hour, created_at DESC)
  WHERE local_hour IS NOT NULL;
