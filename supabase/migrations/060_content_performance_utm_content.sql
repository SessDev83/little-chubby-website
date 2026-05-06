-- Migration 060 — Content performance native/UTM attribution
--
-- Purpose: keep the native social post id and the agent-generated UTM creative
-- id in the same row so collectors, reports, and future bandit scoring can map
-- post -> creative -> site outcomes without relying only on campaign fallback.

ALTER TABLE public.content_performance
  ADD COLUMN IF NOT EXISTS utm_source text,
  ADD COLUMN IF NOT EXISTS utm_content text;

CREATE INDEX IF NOT EXISTS idx_content_performance_utm_content
  ON public.content_performance (utm_source, utm_content)
  WHERE utm_content IS NOT NULL;

COMMENT ON COLUMN public.content_performance.utm_source IS
  'UTM source embedded in the post URL, usually matching the social platform.';

COMMENT ON COLUMN public.content_performance.utm_content IS
  'Agent creative id from utm_content, used to reconcile native post ids with tagged site outcomes.';
