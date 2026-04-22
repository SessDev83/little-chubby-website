-- Migration 046: Notification preferences per profile
-- Phase E.4: gate account-based emails (giveaway, community, shop).
-- Newsletter has its own double opt-in/unsubscribe in newsletter_subscribers,
-- so it is NOT included here to avoid double-gating.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS notification_prefs jsonb NOT NULL
  DEFAULT jsonb_build_object(
    'giveaway',  true,
    'community', true,
    'shop',      true
  );

COMMENT ON COLUMN public.profiles.notification_prefs IS
  'Per-user email kind toggles. Keys: giveaway (winner/ticket gift), community (shoutout/pin), shop (drops/early access). Account & security emails are always sent.';

-- Helper: can we send the given email kind to this user?
-- Returns true when the pref is missing (forward-compatible with new kinds)
-- or when the pref is explicitly true. Returns false only on explicit opt-out.
CREATE OR REPLACE FUNCTION public.can_send_email(
  p_user_id uuid,
  p_kind    text
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT COALESCE(
    (notification_prefs ->> p_kind)::boolean,
    true  -- default opt-in for unknown kinds
  )
  FROM public.profiles
  WHERE id = p_user_id;
$$;

REVOKE ALL ON FUNCTION public.can_send_email(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_send_email(uuid, text) TO service_role, authenticated;

-- Users can update their own notification_prefs via existing RLS on profiles.
-- No new policy needed (profiles.update already scoped to auth.uid() = id).
