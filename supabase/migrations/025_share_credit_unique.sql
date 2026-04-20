-- Migration 025: Prevent duplicate share credits via partial unique index
-- This eliminates the race-condition window in share-reward and track-share APIs.

-- One credit per (user, share, review) — ref_id is the review UUID
CREATE UNIQUE INDEX IF NOT EXISTS uq_credit_share_ref
  ON public.credit_transactions (user_id, ref_id)
  WHERE reason = 'share' AND ref_id IS NOT NULL;
