-- ═══════════════════════════════════════════════════════
-- Migration 002 — Unified Book Reviews & Community Gallery
-- Replaces 'purchases' + 'lottery_entries' with 'book_reviews'
-- Each review = photo proof + star rating + comment
-- Each approved review = 5 lottery tickets (computed at draw)
-- ═══════════════════════════════════════════════════════

-- Drop replaced tables (no real data yet)
DROP TABLE IF EXISTS public.lottery_entries CASCADE;
DROP TABLE IF EXISTS public.purchases CASCADE;

-- ── Book Reviews ─────────────────────────────────────
CREATE TABLE public.book_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  book_id text NOT NULL,
  photo_url text NOT NULL,
  rating smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
  review_text text DEFAULT '',
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  featured boolean DEFAULT false,
  show_in_gallery boolean DEFAULT true,
  reviewer_note text,
  submitted_at timestamptz DEFAULT now(),
  reviewed_at timestamptz,
  UNIQUE(user_id, book_id)
);

ALTER TABLE public.book_reviews ENABLE ROW LEVEL SECURITY;

-- Authenticated users see their own reviews (any status)
CREATE POLICY "read_own_reviews"
  ON public.book_reviews FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Everyone can see approved reviews (gallery / public pages)
CREATE POLICY "read_approved_reviews"
  ON public.book_reviews FOR SELECT
  USING (status = 'approved');

-- Users can submit their own reviews
CREATE POLICY "insert_own_review"
  ON public.book_reviews FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- ── Public Gallery View ──────────────────────────────
-- security_invoker=false → runs as view owner (bypasses RLS)
-- The WHERE clause acts as the security filter
CREATE OR REPLACE VIEW public.gallery_feed
WITH (security_invoker = false) AS
  SELECT
    r.id,
    r.book_id,
    r.photo_url,
    r.rating,
    r.review_text,
    r.featured,
    r.submitted_at,
    CASE
      WHEN r.show_in_gallery
        THEN COALESCE(p.display_name, 'Reader')
      ELSE 'Anonymous'
    END AS display_name
  FROM public.book_reviews r
  JOIN public.profiles p ON p.id = r.user_id
  WHERE r.status = 'approved'
  ORDER BY r.featured DESC, r.submitted_at DESC;

-- ── Fix lottery_winners_public (needs security_invoker=false) ──
DROP VIEW IF EXISTS public.lottery_winners_public;
CREATE VIEW public.lottery_winners_public
WITH (security_invoker = false) AS
  SELECT
    w.month,
    w.book_chosen,
    p.display_name
  FROM public.lottery_winners w
  JOIN public.profiles p ON p.id = w.user_id
  WHERE w.claimed = true OR w.claim_deadline < now()
  ORDER BY w.month DESC;

-- ── Storage bucket for book photos ───────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('book-photos', 'book-photos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "public_read_book_photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'book-photos');

CREATE POLICY "auth_upload_book_photos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'book-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "auth_delete_own_photos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'book-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- ── Simplify lottery_config ──────────────────────────
-- buyers_only no longer needed (always requires reviews)
ALTER TABLE public.lottery_config
  DROP COLUMN IF EXISTS buyers_only;
