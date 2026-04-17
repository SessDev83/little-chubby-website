-- ─── Engagement Snapshots + Facebook Group support ─────────────────────────
-- 1. Historical snapshots of per-post engagement (taken every 6h)
--    so we can see how a post's engagement grows over time.
-- 2. Facebook group posts tracking table.

-- ── 1. Engagement snapshots ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.engagement_snapshots (
    id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    platform      text NOT NULL,          -- bluesky | facebook | instagram
    post_id       text NOT NULL,          -- platform-specific post ID
    likes         integer NOT NULL DEFAULT 0,
    comments      integer NOT NULL DEFAULT 0,
    shares        integer NOT NULL DEFAULT 0,
    followers     integer DEFAULT 0,      -- profile followers at snapshot time
    snapshot_at   timestamptz NOT NULL DEFAULT now()
);

-- One snapshot per post per collection run (enforce via app logic, not constraint,
-- because we actually WANT multiple snapshots per day — that's the point)
CREATE INDEX idx_engagement_snapshots_post
    ON public.engagement_snapshots (platform, post_id, snapshot_at DESC);

CREATE INDEX idx_engagement_snapshots_date
    ON public.engagement_snapshots (snapshot_at DESC);

ALTER TABLE public.engagement_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on engagement_snapshots"
    ON public.engagement_snapshots
    FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- ── 2. Facebook group posts tracking ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.fb_group_posts (
    id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    group_id      text NOT NULL,
    group_name    text,
    post_id       text NOT NULL,          -- Facebook post ID in the group
    message       text,
    posted_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_fb_group_posts_group
    ON public.fb_group_posts (group_id, posted_at DESC);

ALTER TABLE public.fb_group_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on fb_group_posts"
    ON public.fb_group_posts
    FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');
