-- ─── Fix upsert conflicts ──────────────────────────────────────────────────
-- PostgREST requires named UNIQUE CONSTRAINTs (not just unique indexes) for
-- ON CONFLICT resolution.  This migration promotes the existing unique indexes
-- to proper constraints so that `?on_conflict=col1,col2` works reliably.

-- 1. traffic_insights: (date, source_category, source_detail)
ALTER TABLE public.traffic_insights
  DROP CONSTRAINT IF EXISTS uq_traffic_insights_date_source;

DROP INDEX IF EXISTS public.idx_traffic_insights_date_source;

ALTER TABLE public.traffic_insights
  ADD CONSTRAINT uq_traffic_insights_date_source
  UNIQUE (date, source_category, source_detail);

-- 2. content_performance: (post_id, platform)
ALTER TABLE public.content_performance
  DROP CONSTRAINT IF EXISTS uq_content_performance_post;

DROP INDEX IF EXISTS public.idx_content_performance_post;

ALTER TABLE public.content_performance
  ADD CONSTRAINT uq_content_performance_post
  UNIQUE (post_id, platform);
