-- ─── Agent Intelligence Tables ──────────────────────────────────────────────
-- These tables power the 24/7 AI agent system that collects social media metrics,
-- aggregates traffic data, links content performance, and logs AI decisions.

-- ── 1. Social metrics: per-platform engagement snapshots ────────────────────
CREATE TABLE IF NOT EXISTS public.social_metrics (
    id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    platform      text NOT NULL,          -- bluesky | facebook | instagram
    metric_type   text NOT NULL,          -- followers | post_engagement | profile_stats
    value         jsonb NOT NULL DEFAULT '{}',
    post_id       text,                   -- platform-specific post/media ID (nullable for profile-level)
    collected_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_social_metrics_platform_date
    ON public.social_metrics (platform, collected_at DESC);

CREATE INDEX idx_social_metrics_type
    ON public.social_metrics (metric_type, collected_at DESC);

-- RLS: service role only
ALTER TABLE public.social_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on social_metrics"
    ON public.social_metrics
    FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- ── 2. Traffic insights: daily aggregated traffic by source ─────────────────
CREATE TABLE IF NOT EXISTS public.traffic_insights (
    id               bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    date             date NOT NULL,
    source_category  text NOT NULL,       -- organic | social | direct | referral | email
    source_detail    text NOT NULL DEFAULT '',  -- e.g. "bluesky", "facebook", "google", specific referrer
    sessions         integer NOT NULL DEFAULT 0,
    pageviews        integer NOT NULL DEFAULT 0,
    unique_visitors  integer NOT NULL DEFAULT 0,
    top_pages        jsonb DEFAULT '[]',  -- [{path, count}, ...]
    created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_traffic_insights_date_source
    ON public.traffic_insights (date, source_category, source_detail);

CREATE INDEX idx_traffic_insights_date
    ON public.traffic_insights (date DESC);

ALTER TABLE public.traffic_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on traffic_insights"
    ON public.traffic_insights
    FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- ── 3. Content performance: link social posts to website traffic ────────────
CREATE TABLE IF NOT EXISTS public.content_performance (
    id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    post_type     text NOT NULL,          -- book-promo | blog-share | engagement | etc.
    platform      text NOT NULL,          -- bluesky | facebook | instagram
    posted_at     timestamptz,
    post_id       text NOT NULL,           -- platform-specific post ID
    likes         integer DEFAULT 0,
    comments      integer DEFAULT 0,
    shares        integer DEFAULT 0,
    clicks        integer DEFAULT 0,      -- UTM-attributed clicks from pageviews
    reach         integer DEFAULT 0,
    utm_campaign  text,                   -- the UTM campaign tag used
    created_at    timestamptz NOT NULL DEFAULT now(),
    updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_content_performance_platform_date
    ON public.content_performance (platform, posted_at DESC);

CREATE INDEX idx_content_performance_type
    ON public.content_performance (post_type, posted_at DESC);

CREATE UNIQUE INDEX idx_content_performance_post
    ON public.content_performance (post_id, platform);

ALTER TABLE public.content_performance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on content_performance"
    ON public.content_performance
    FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- ── 4. Agent decisions: AI reasoning audit trail ────────────────────────────
CREATE TABLE IF NOT EXISTS public.agent_decisions (
    id                bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    decision_type     text NOT NULL,      -- content_recommendation | timing_adjustment | outreach_priority | weekly_analysis
    recommended_action text NOT NULL,
    reasoning         text,
    confidence_score  real,               -- 0.0 to 1.0
    context_data      jsonb DEFAULT '{}', -- raw data the AI used to decide
    executed          boolean DEFAULT false,
    executed_at       timestamptz,
    created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_agent_decisions_type_date
    ON public.agent_decisions (decision_type, created_at DESC);

CREATE INDEX idx_agent_decisions_pending
    ON public.agent_decisions (executed, created_at DESC)
    WHERE executed = false;

ALTER TABLE public.agent_decisions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on agent_decisions"
    ON public.agent_decisions
    FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');
