-- ═══════════════════════════════════════════════════════════════════════════
-- Migration 056 — Per-IP throttle for newsletter signups
--
-- Adds an opaque `ip_hash` column to newsletter_subscribers so the subscribe
-- API can enforce a per-IP rate limit (5 / hour) instead of the previous
-- global-only 30 / hour cap which would 429 legitimate users during a viral
-- spike. Pkg P4-A6 (audit finding #9).
--
-- The hash is SHA-256 of (client IP + service-role-key as salt), truncated
-- server-side. We never store the raw IP. GDPR posture preserved.
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE public.newsletter_subscribers
  ADD COLUMN IF NOT EXISTS ip_hash text;

-- Length guard — sha256 truncated to 32 hex chars
ALTER TABLE public.newsletter_subscribers
  DROP CONSTRAINT IF EXISTS newsletter_subscribers_ip_hash_len;
ALTER TABLE public.newsletter_subscribers
  ADD CONSTRAINT newsletter_subscribers_ip_hash_len
    CHECK (ip_hash IS NULL OR char_length(ip_hash) <= 64);

-- Partial index used by per-IP rate-limit lookup (only recent rows matter)
CREATE INDEX IF NOT EXISTS idx_newsletter_subscribers_ip_hash_recent
  ON public.newsletter_subscribers (ip_hash, created_at DESC)
  WHERE ip_hash IS NOT NULL;
