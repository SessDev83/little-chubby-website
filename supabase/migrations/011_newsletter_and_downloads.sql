-- Migration 011: Newsletter subscribers, free artworks, download tracking, social shares
-- Supports: Lead magnet popup, Coloring Corner gallery, daily newsletter, share-based rewards

-- ── Newsletter Subscribers ─────────────────────────────────
create table if not exists public.newsletter_subscribers (
  id         uuid primary key default gen_random_uuid(),
  email      text unique not null,
  name       text default '',
  source     text default 'popup',          -- popup | newsletter-page | footer
  confirmed  boolean default false,
  confirm_token uuid default gen_random_uuid(),
  lang_pref  text default 'en' check (lang_pref in ('es','en')),
  created_at timestamptz default now()
);

alter table public.newsletter_subscribers enable row level security;

-- Only service role can read/write (no public access to subscriber list)
create policy "service_role_all_newsletter"
  on public.newsletter_subscribers
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- Allow anonymous insert for popup/form submissions (no read)
create policy "anon_insert_newsletter"
  on public.newsletter_subscribers
  for insert
  with check (true);

-- ── Free Artworks ──────────────────────────────────────────
create table if not exists public.free_artworks (
  id             uuid primary key default gen_random_uuid(),
  title_es       text not null default '',
  title_en       text not null default '',
  category       text not null default 'basic',
  image_path     text not null,                -- Supabase Storage path
  thumbnail_path text not null default '',     -- smaller version path
  active         boolean default true,
  sort_order     int default 0,
  created_at     timestamptz default now()
);

alter table public.free_artworks enable row level security;

-- Anyone can view active artworks (thumbnails are public)
create policy "public_read_artworks"
  on public.free_artworks
  for select
  using (active = true);

-- Only service role can manage artworks
create policy "service_role_manage_artworks"
  on public.free_artworks
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- ── Artwork Downloads (tracking for daily limits) ──────────
create table if not exists public.artwork_downloads (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  artwork_id    uuid not null references public.free_artworks(id) on delete cascade,
  downloaded_at timestamptz default now()
);

create index idx_downloads_user_date
  on public.artwork_downloads (user_id, downloaded_at);

alter table public.artwork_downloads enable row level security;

-- Users can see their own downloads
create policy "users_read_own_downloads"
  on public.artwork_downloads
  for select
  using (auth.uid() = user_id);

-- Users can insert their own downloads
create policy "users_insert_own_downloads"
  on public.artwork_downloads
  for insert
  with check (auth.uid() = user_id);

-- ── Social Shares (tracking for bonus downloads) ──────────
create table if not exists public.social_shares (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  platform   text not null default 'copy-link',   -- facebook | whatsapp | bluesky | copy-link
  shared_url text not null default '',
  created_at timestamptz default now()
);

-- Prevent spam: one share per platform per URL per day
create unique index idx_unique_share_per_day
  on public.social_shares (user_id, platform, shared_url, (created_at::date));

create index idx_shares_user_date
  on public.social_shares (user_id, created_at);

alter table public.social_shares enable row level security;

-- Users can see their own shares
create policy "users_read_own_shares"
  on public.social_shares
  for select
  using (auth.uid() = user_id);

-- Users can insert their own shares
create policy "users_insert_own_shares"
  on public.social_shares
  for insert
  with check (auth.uid() = user_id);

-- ── Storage Buckets ────────────────────────────────────────
-- Note: Run these via Supabase dashboard or CLI, not raw SQL:
-- supabase storage create free-artworks --public=false
-- supabase storage create lead-magnets --public=false
