-- Migration 032: Expose user_id on gallery_feed view
-- Phase A (visibility): so gallery.astro can batch-fetch author badges
-- in one query (avoid N+1). is_pinned and has_gold_border already exist
-- (added in 014); we keep them and simply surface user_id.

drop view if exists public.gallery_feed;
create view public.gallery_feed
with (security_invoker = false) as
  select
    r.id,
    r.user_id,                -- NEW: author id for badge batch lookup
    r.book_id,
    r.photo_url,
    r.extra_photos,
    r.rating,
    r.review_text,
    r.featured,
    r.submitted_at,
    case
      when r.show_in_gallery
        then coalesce(p.display_name, 'Reader')
      else 'Anonymous'
    end as display_name,
    -- Boost info (active only)
    exists (
      select 1 from public.gallery_boosts gb
      where gb.review_id = r.id
        and gb.boost_type = 'pin_7d'
        and gb.expires_at > now()
    ) as is_pinned,
    exists (
      select 1 from public.gallery_boosts gb
      where gb.review_id = r.id
        and gb.boost_type = 'gold_border'
        and gb.expires_at > now()
    ) as has_gold_border
  from public.book_reviews r
  join public.profiles p on p.id = r.user_id
  where r.status = 'approved'
    and r.show_in_gallery = true
  order by
    exists (
      select 1 from public.gallery_boosts gb
      where gb.review_id = r.id
        and gb.boost_type = 'pin_7d'
        and gb.expires_at > now()
    ) desc,
    r.featured desc,
    r.submitted_at desc;

comment on view public.gallery_feed is
  'Public approved reviews with live boost flags and author user_id for badge lookups.';
