-- ═══════════════════════════════════════════════════════════════════════════
-- Migration 057 — Conversion Event Contract V1 hardening
--
-- Purpose: add idempotency and event-time fields without breaking older
-- browser tracking payloads. Event-name normalization stays in app code so
-- historical rows can be read through the V1 contract without destructive
-- rewrites.
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE public.conversion_events
  ADD COLUMN IF NOT EXISTS event_id text,
  ADD COLUMN IF NOT EXISTS occurred_at timestamptz;

UPDATE public.conversion_events
SET occurred_at = COALESCE(occurred_at, created_at, now())
WHERE occurred_at IS NULL;

ALTER TABLE public.conversion_events
  ALTER COLUMN occurred_at SET DEFAULT now(),
  ALTER COLUMN occurred_at SET NOT NULL;

UPDATE public.conversion_events
SET event_id = 'legacy_' || id::text
WHERE event_id IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'conversion_events_event_id_len'
  ) THEN
    ALTER TABLE public.conversion_events
      ADD CONSTRAINT conversion_events_event_id_len
        CHECK (event_id IS NULL OR char_length(event_id) <= 96);
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_conversion_events_event_id
  ON public.conversion_events (event_id)
  WHERE event_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_conversion_events_occurred_at
  ON public.conversion_events (occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_conversion_events_session_id
  ON public.conversion_events ((props->>'session_id'))
  WHERE props ? 'session_id';

CREATE INDEX IF NOT EXISTS idx_conversion_events_anonymous_id
  ON public.conversion_events ((props->>'anonymous_id'))
  WHERE props ? 'anonymous_id';
