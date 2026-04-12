-- ═══════════════════════════════════════════════════════
-- Migration 003 — Lightweight Pageview Tracking
-- Cookie-free, privacy-friendly page analytics stored in Supabase.
-- Used by the daily analytics email report.
-- ═══════════════════════════════════════════════════════

CREATE TABLE public.pageviews (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  path text NOT NULL,
  referrer text,
  country text,
  -- daily visitor hash (SHA-256 of IP+UA+date, computed server-side or client-side)
  visitor_hash text,
  created_at timestamptz DEFAULT now()
);

-- Index for daily report queries
CREATE INDEX idx_pageviews_created_at ON public.pageviews (created_at);
CREATE INDEX idx_pageviews_path ON public.pageviews (path);

ALTER TABLE public.pageviews ENABLE ROW LEVEL SECURITY;

-- Anyone can insert (anonymous visitors via anon key)
CREATE POLICY "anon_insert_pageviews"
  ON public.pageviews FOR INSERT
  WITH CHECK (true);

-- Only service_role can read (for the daily email script)
CREATE POLICY "service_read_pageviews"
  ON public.pageviews FOR SELECT
  USING (auth.role() = 'service_role');
