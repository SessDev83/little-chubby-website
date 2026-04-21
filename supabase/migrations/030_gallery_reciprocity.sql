-- Migration 030 — Gallery reciprocity tracking
-- Playbook §13.2: when a real (non-sample) review is approved, generate
-- a public thank-you post (IG story / Bluesky / FB) within 24h. This
-- flag prevents double-thanking and lets gallery-reciprocity.mjs pick up
-- only freshly-approved reviews.

ALTER TABLE public.book_reviews
  ADD COLUMN IF NOT EXISTS thanked_at timestamptz;

ALTER TABLE public.book_reviews
  ADD COLUMN IF NOT EXISTS thanked_channels jsonb DEFAULT '[]'::jsonb;

-- Helper view: reviews approved but not yet thanked (the queue).
CREATE OR REPLACE VIEW public.reviews_awaiting_thanks AS
SELECT
  r.id,
  r.user_id,
  r.book_id,
  r.rating,
  r.review_text,
  r.photo_url,
  r.submitted_at,
  r.reviewed_at,
  p.display_name AS reviewer_name,
  p.avatar_url AS reviewer_avatar
FROM public.book_reviews r
LEFT JOIN public.profiles p ON p.id = r.user_id
WHERE r.status = 'approved'
  AND r.show_in_gallery = true
  AND r.thanked_at IS NULL
ORDER BY r.reviewed_at ASC NULLS LAST
LIMIT 20;

COMMENT ON VIEW public.reviews_awaiting_thanks IS
  'Playbook §13.2 queue — reviews approved but no reciprocity post yet. Consumed by scripts/social/gallery-reciprocity.mjs.';
