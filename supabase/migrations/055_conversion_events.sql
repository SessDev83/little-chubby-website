-- ═══════════════════════════════════════════════════════════════════════════
-- Migration 055 — Conversion Events
--
-- Purpose: lightweight event-level tracking to measure the conversion funnel.
-- Mirrors the pageviews pattern (anon insert, service-role read, RLS on).
--
-- Used by:
--   • Lead magnet popup (shown / submit success / submit error)
--   • Inline newsletter capture (submit success / error)
--   • Register form (started / completed)
--   • Lottery entry flow (attempt / success)
--   • Newsletter confirmation endpoint (confirmed)
--
-- Design:
--   • props is jsonb so we can attach context without schema migrations
--   • visitor_hash mirrors pageviews → join-able for funnel analysis
--   • created_at indexed for daily/weekly rollups
--   • event_name indexed for per-event drill-down
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.conversion_events (
  id           bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  event_name   text NOT NULL,
  path         text,
  visitor_hash text,
  props        jsonb NOT NULL DEFAULT '{}'::jsonb,
  lang         text,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- Length guard against abuse (keep payloads small)
ALTER TABLE public.conversion_events
  ADD CONSTRAINT conversion_events_event_name_len
    CHECK (char_length(event_name) <= 64),
  ADD CONSTRAINT conversion_events_path_len
    CHECK (path IS NULL OR char_length(path) <= 500),
  ADD CONSTRAINT conversion_events_visitor_hash_len
    CHECK (visitor_hash IS NULL OR char_length(visitor_hash) <= 80);

CREATE INDEX IF NOT EXISTS idx_conversion_events_created_at
  ON public.conversion_events (created_at);

CREATE INDEX IF NOT EXISTS idx_conversion_events_event_name
  ON public.conversion_events (event_name, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_conversion_events_visitor
  ON public.conversion_events (visitor_hash)
  WHERE visitor_hash IS NOT NULL;

ALTER TABLE public.conversion_events ENABLE ROW LEVEL SECURITY;

-- Anonymous visitors insert via anon key (same pattern as pageviews)
CREATE POLICY "anon_insert_conversion_events"
  ON public.conversion_events FOR INSERT
  WITH CHECK (true);

-- Only service_role can read (for daily/weekly funnel reports)
CREATE POLICY "service_read_conversion_events"
  ON public.conversion_events FOR SELECT
  USING (auth.role() = 'service_role');
