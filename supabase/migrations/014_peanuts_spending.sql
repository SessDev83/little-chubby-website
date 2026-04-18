-- Migration 014: Peanuts spending options
-- Profile badges, gallery boosts, extra lottery entries, premium artworks

-- ── Profile Badges ────────────────────────────────────────
create table if not exists public.profile_badges (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  badge_type  text not null check (badge_type in (
    'frame_gold', 'frame_silver', 'top_reviewer', 'star_parent'
  )),
  active      boolean default true,
  purchased_at timestamptz default now()
);

create index idx_badges_user on public.profile_badges (user_id);

alter table public.profile_badges enable row level security;

-- Users can read their own badges
create policy "users_read_own_badges"
  on public.profile_badges for select
  using (auth.uid() = user_id);

-- Anyone can read badges (displayed on gallery cards / profiles)
create policy "public_read_badges"
  on public.profile_badges for select
  using (true);

-- Only service role can insert/manage
create policy "service_manage_badges"
  on public.profile_badges for insert
  with check (auth.role() = 'service_role');

-- ── Gallery Boosts ────────────────────────────────────────
create table if not exists public.gallery_boosts (
  id          uuid primary key default gen_random_uuid(),
  review_id   uuid not null references public.book_reviews(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  boost_type  text not null check (boost_type in ('pin_7d', 'gold_border')),
  expires_at  timestamptz not null,
  purchased_at timestamptz default now()
);

create index idx_boosts_review on public.gallery_boosts (review_id);
create index idx_boosts_expiry on public.gallery_boosts (expires_at);

alter table public.gallery_boosts enable row level security;

-- Anyone can see active boosts (needed to render gallery)
create policy "public_read_boosts"
  on public.gallery_boosts for select
  using (expires_at > now());

-- Only service role can insert
create policy "service_insert_boosts"
  on public.gallery_boosts for insert
  with check (auth.role() = 'service_role');

-- ── Extra Lottery Entries (purchased with Peanuts) ────────
create table if not exists public.lottery_entries (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles(id) on delete cascade,
  month        text not null,                 -- '2026-04' format
  entry_count  int not null default 1,
  purchased_at timestamptz default now()
);

create index idx_lottery_entries_user_month
  on public.lottery_entries (user_id, month);

alter table public.lottery_entries enable row level security;

-- Users read their own entries
create policy "users_read_own_entries"
  on public.lottery_entries for select
  using (auth.uid() = user_id);

-- Only service role can insert
create policy "service_insert_entries"
  on public.lottery_entries for insert
  with check (auth.role() = 'service_role');

-- ── Premium Artworks (extend free_artworks table) ─────────
alter table public.free_artworks
  add column if not exists is_premium boolean default false;

alter table public.free_artworks
  add column if not exists peanut_cost int default 1;

-- ── Update gallery_feed view to include active boosts ─────
drop view if exists public.gallery_feed;
create view public.gallery_feed
with (security_invoker = false) as
  select
    r.id,
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
    -- Pinned reviews float to top
    exists (
      select 1 from public.gallery_boosts gb
      where gb.review_id = r.id
        and gb.boost_type = 'pin_7d'
        and gb.expires_at > now()
    ) desc,
    r.featured desc,
    r.submitted_at desc;

-- ── Peanuts pricing reference (constants, no table needed) ─
-- Profile badge:        15 🥜
-- Gallery boost (7d):   10 🥜
-- Extra lottery entry:   3 🥜
-- Premium artwork DL:    peanut_cost column (default 3 for premium, 1 for regular)
comment on table public.profile_badges is 'Costs 15 Peanuts each';
comment on table public.gallery_boosts is 'Costs 10 Peanuts each, lasts 7 days';
comment on table public.lottery_entries is 'Costs 3 Peanuts per entry';

-- ── Update credit_transactions reason constraint ──────────
alter table public.credit_transactions
  drop constraint if exists credit_transactions_reason_check;

alter table public.credit_transactions
  add constraint credit_transactions_reason_check
  check (reason in ('review','share','download','admin','giveaway','badge','boost','lottery_entry'));
