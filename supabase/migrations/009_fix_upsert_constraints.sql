-- Promote existing unique indexes to named constraints so PostgREST can
-- resolve ON CONFLICT for upsert operations correctly.
-- (CREATE UNIQUE INDEX alone is not always picked up by PostgREST as a
--  conflict target; naming it as a constraint ensures compatibility.)

ALTER TABLE public.traffic_insights
  ADD CONSTRAINT uq_traffic_insights_date_source
  UNIQUE USING INDEX idx_traffic_insights_date_source;

ALTER TABLE public.content_performance
  ADD CONSTRAINT uq_content_performance_post
  UNIQUE USING INDEX idx_content_performance_post;
