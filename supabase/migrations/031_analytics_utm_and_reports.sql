-- ═══════════════════════════════════════════════════════════════════════════
-- Migration 031 — UTM Capture + Weekly/Monthly Reports + Rollup Views
--
-- Purpose:
--   1. Capture UTM parameters from landing-page URLs (set by social agents)
--   2. Store professional weekly & monthly reports for agent feedback loops
--   3. Add reach/impressions separation on content_performance
--   4. Provide fast rollup views for 7d / 30d queries
--
-- Design principles:
--   - 100% additive — no column drops, no type changes, no breaking ALTER
--   - All new columns nullable with safe defaults
--   - Existing indexes untouched
--   - RLS preserved: service-role-only access on new tables
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. pageviews: capture UTM parameters from landing URL ──────────────────
ALTER TABLE public.pageviews
  ADD COLUMN IF NOT EXISTS utm_source   text,
  ADD COLUMN IF NOT EXISTS utm_medium   text,
  ADD COLUMN IF NOT EXISTS utm_campaign text,
  ADD COLUMN IF NOT EXISTS utm_content  text,
  ADD COLUMN IF NOT EXISTS landing_page text;  -- full path+search first-hit

-- Lookup index for per-post attribution (utm_content = creative-id)
CREATE INDEX IF NOT EXISTS idx_pageviews_utm_content
  ON public.pageviews (utm_content)
  WHERE utm_content IS NOT NULL;

-- Lookup index for source attribution
CREATE INDEX IF NOT EXISTS idx_pageviews_utm_source
  ON public.pageviews (utm_source, created_at DESC)
  WHERE utm_source IS NOT NULL;

-- ── 2. content_performance: separate impressions from reach ────────────────
ALTER TABLE public.content_performance
  ADD COLUMN IF NOT EXISTS impressions integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS content_url text,       -- canonical URL the post links to
  ADD COLUMN IF NOT EXISTS ctr numeric GENERATED ALWAYS AS (
    CASE
      WHEN COALESCE(reach, 0) > 0 THEN (COALESCE(clicks, 0)::numeric / reach)
      WHEN COALESCE(impressions, 0) > 0 THEN (COALESCE(clicks, 0)::numeric / impressions)
      ELSE 0
    END
  ) STORED;

-- ── 3. weekly_reports: one row per ISO-week (JSON payload) ─────────────────
CREATE TABLE IF NOT EXISTS public.weekly_reports (
    id             bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    week_start     date NOT NULL,              -- Monday of the ISO week
    week_end       date NOT NULL,              -- Sunday of the ISO week
    generated_at   timestamptz NOT NULL DEFAULT now(),
    -- Top-level KPIs for dashboards
    total_pageviews    integer NOT NULL DEFAULT 0,
    unique_visitors    integer NOT NULL DEFAULT 0,
    total_posts        integer NOT NULL DEFAULT 0,
    total_clicks       integer NOT NULL DEFAULT 0,
    total_engagement   integer NOT NULL DEFAULT 0,  -- likes+comments+shares
    new_subscribers    integer NOT NULL DEFAULT 0,
    follower_deltas    jsonb NOT NULL DEFAULT '{}',  -- {bluesky:+4, facebook:+6, ...}
    -- Structured analysis for agents to consume
    top_posts          jsonb NOT NULL DEFAULT '[]',  -- [{post_id, platform, ctr, clicks, engagement, post_type, utm_content}]
    worst_posts        jsonb NOT NULL DEFAULT '[]',  -- [{post_id, platform, reason}]
    best_post_types    jsonb NOT NULL DEFAULT '[]',  -- [{post_type, avg_ctr, total_clicks, rank}]
    best_posting_hours jsonb NOT NULL DEFAULT '[]',  -- [{hour, avg_engagement, post_count}]
    source_breakdown   jsonb NOT NULL DEFAULT '[]',  -- [{source, pageviews, % }]
    blog_performance   jsonb NOT NULL DEFAULT '[]',  -- [{path, pageviews, top_source}]
    utm_attribution    jsonb NOT NULL DEFAULT '[]',  -- [{utm_campaign, utm_content, clicks, creative_id}]
    -- AI-generated narrative summary + recommendations
    summary            text,
    recommendations    jsonb NOT NULL DEFAULT '[]',  -- [{action, priority, reasoning}]
    -- Free-form raw payload for debugging / future fields
    raw_data           jsonb NOT NULL DEFAULT '{}'
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_weekly_reports_week
    ON public.weekly_reports (week_start);

CREATE INDEX IF NOT EXISTS idx_weekly_reports_generated
    ON public.weekly_reports (generated_at DESC);

ALTER TABLE public.weekly_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access on weekly_reports" ON public.weekly_reports;
CREATE POLICY "Service role full access on weekly_reports"
    ON public.weekly_reports
    FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- ── 4. monthly_reports: one row per calendar month ─────────────────────────
CREATE TABLE IF NOT EXISTS public.monthly_reports (
    id                 bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    month_start        date NOT NULL,           -- first day of month
    month_end          date NOT NULL,           -- last day of month
    generated_at       timestamptz NOT NULL DEFAULT now(),
    total_pageviews    integer NOT NULL DEFAULT 0,
    unique_visitors    integer NOT NULL DEFAULT 0,
    total_posts        integer NOT NULL DEFAULT 0,
    total_clicks       integer NOT NULL DEFAULT 0,
    total_engagement   integer NOT NULL DEFAULT 0,
    new_subscribers    integer NOT NULL DEFAULT 0,
    follower_deltas    jsonb NOT NULL DEFAULT '{}',
    week_over_week     jsonb NOT NULL DEFAULT '[]',  -- weekly trend within the month
    top_posts          jsonb NOT NULL DEFAULT '[]',
    best_post_types    jsonb NOT NULL DEFAULT '[]',
    best_posting_hours jsonb NOT NULL DEFAULT '[]',
    source_breakdown   jsonb NOT NULL DEFAULT '[]',
    blog_performance   jsonb NOT NULL DEFAULT '[]',
    utm_attribution    jsonb NOT NULL DEFAULT '[]',
    summary            text,
    recommendations    jsonb NOT NULL DEFAULT '[]',
    raw_data           jsonb NOT NULL DEFAULT '{}'
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_monthly_reports_month
    ON public.monthly_reports (month_start);

ALTER TABLE public.monthly_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access on monthly_reports" ON public.monthly_reports;
CREATE POLICY "Service role full access on monthly_reports"
    ON public.monthly_reports
    FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- ── 5. Rollup views for fast agent queries ─────────────────────────────────
-- Rebuild-safe (CREATE OR REPLACE)
CREATE OR REPLACE VIEW public.v_content_performance_7d AS
SELECT
    cp.post_type,
    cp.platform,
    COUNT(*)                   AS post_count,
    SUM(cp.likes)              AS total_likes,
    SUM(cp.comments)           AS total_comments,
    SUM(cp.shares)             AS total_shares,
    SUM(cp.clicks)             AS total_clicks,
    SUM(cp.reach)              AS total_reach,
    SUM(cp.impressions)        AS total_impressions,
    AVG(cp.ctr)                AS avg_ctr,
    AVG(cp.likes + cp.comments + cp.shares) AS avg_engagement
FROM public.content_performance cp
WHERE cp.posted_at >= (now() - interval '7 days')
GROUP BY cp.post_type, cp.platform;

CREATE OR REPLACE VIEW public.v_content_performance_30d AS
SELECT
    cp.post_type,
    cp.platform,
    COUNT(*)                   AS post_count,
    SUM(cp.likes)              AS total_likes,
    SUM(cp.comments)           AS total_comments,
    SUM(cp.shares)             AS total_shares,
    SUM(cp.clicks)             AS total_clicks,
    SUM(cp.reach)              AS total_reach,
    SUM(cp.impressions)        AS total_impressions,
    AVG(cp.ctr)                AS avg_ctr,
    AVG(cp.likes + cp.comments + cp.shares) AS avg_engagement
FROM public.content_performance cp
WHERE cp.posted_at >= (now() - interval '30 days')
GROUP BY cp.post_type, cp.platform;

-- UTM click rollup — last 30 days, per utm_content creative-id
CREATE OR REPLACE VIEW public.v_utm_clicks_30d AS
SELECT
    utm_source,
    utm_medium,
    utm_campaign,
    utm_content,
    COUNT(*)                               AS clicks,
    COUNT(DISTINCT visitor_hash)           AS unique_clicks,
    MIN(created_at)                        AS first_click,
    MAX(created_at)                        AS last_click
FROM public.pageviews
WHERE created_at >= (now() - interval '30 days')
  AND utm_source IS NOT NULL
GROUP BY utm_source, utm_medium, utm_campaign, utm_content;

-- Grant read to service_role (anon already blocked by RLS on base tables)
GRANT SELECT ON public.v_content_performance_7d  TO service_role;
GRANT SELECT ON public.v_content_performance_30d TO service_role;
GRANT SELECT ON public.v_utm_clicks_30d          TO service_role;
