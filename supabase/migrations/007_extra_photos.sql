-- Allow multiple photos per review (cover + interiors)
ALTER TABLE public.book_reviews
  ADD COLUMN IF NOT EXISTS extra_photos text[] DEFAULT '{}';

-- Update gallery_feed view to include extra_photos
DROP VIEW IF EXISTS public.gallery_feed;
CREATE VIEW public.gallery_feed AS
SELECT
    r.id,
    r.book_id,
    r.photo_url,
    r.extra_photos,
    r.rating,
    r.review_text,
    r.featured,
    r.submitted_at,
    p.display_name
FROM public.book_reviews r
JOIN public.profiles p ON p.id = r.user_id
WHERE r.status = 'approved'
  AND r.show_in_gallery = true
ORDER BY r.featured DESC, r.submitted_at DESC;
