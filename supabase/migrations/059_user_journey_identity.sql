-- ═══════════════════════════════════════════════════════════════════════════
-- Migration 059 — User journey identity bridge
--
-- Additive-only: preserves existing pageview/conversion data while allowing
-- future authenticated visits and API actions to connect anonymous activity
-- with a registered user or hashed newsletter identity.
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE public.pageviews
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS session_id text,
  ADD COLUMN IF NOT EXISTS anonymous_id text;

CREATE INDEX IF NOT EXISTS idx_pageviews_user_created_at
  ON public.pageviews (user_id, created_at DESC)
  WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_pageviews_session_created_at
  ON public.pageviews (session_id, created_at DESC)
  WHERE session_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_pageviews_anonymous_created_at
  ON public.pageviews (anonymous_id, created_at DESC)
  WHERE anonymous_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.analytics_identities (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  identity_key text NOT NULL UNIQUE,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  email_hash text,
  anonymous_id text,
  session_id text,
  visitor_hash text,
  link_reason text NOT NULL DEFAULT 'activity',
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  linked_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT analytics_identities_has_subject CHECK (user_id IS NOT NULL OR email_hash IS NOT NULL),
  CONSTRAINT analytics_identities_has_analytics_id CHECK (anonymous_id IS NOT NULL OR session_id IS NOT NULL OR visitor_hash IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_analytics_identities_user
  ON public.analytics_identities (user_id, last_seen_at DESC)
  WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_analytics_identities_email_hash
  ON public.analytics_identities (email_hash, last_seen_at DESC)
  WHERE email_hash IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_analytics_identities_anonymous
  ON public.analytics_identities (anonymous_id, last_seen_at DESC)
  WHERE anonymous_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_analytics_identities_session
  ON public.analytics_identities (session_id, last_seen_at DESC)
  WHERE session_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_analytics_identities_visitor
  ON public.analytics_identities (visitor_hash, last_seen_at DESC)
  WHERE visitor_hash IS NOT NULL;

ALTER TABLE public.analytics_identities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_manage_analytics_identities" ON public.analytics_identities;
CREATE POLICY "service_manage_analytics_identities"
  ON public.analytics_identities FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
