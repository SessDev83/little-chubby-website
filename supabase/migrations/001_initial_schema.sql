-- ═══════════════════════════════════════════════════════
-- Little Chubby Press — Full Schema
-- ═══════════════════════════════════════════════════════

-- ── 1. Profiles ──────────────────────────────────────
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text,
  lang_pref text default 'es' check (lang_pref in ('es', 'en')),
  is_admin boolean default false,
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "Users can read own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "Service role can insert profiles"
  on public.profiles for insert
  with check (true);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ── 2. Purchase Verification ─────────────────────────
-- Users submit Amazon order IDs; admin approves.
-- Each verified purchase = more lottery tickets.
create table if not exists public.purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  amazon_order_id text not null,
  book_id text,                        -- matches book.id from books.ts
  status text default 'pending' check (status in ('pending', 'approved', 'rejected')),
  submitted_at timestamptz default now(),
  reviewed_at timestamptz,
  reviewer_note text,
  unique(amazon_order_id)              -- prevent same order submitted twice
);

alter table public.purchases enable row level security;

create policy "Users can read own purchases"
  on public.purchases for select
  using (auth.uid() = user_id);

create policy "Users can submit purchases"
  on public.purchases for insert
  with check (auth.uid() = user_id);

-- ── 3. Lottery Entries (weighted tickets) ─────────────
-- source: 'subscriber' (1 ticket), 'verified_purchase' (5 tickets),
--         'review' (3 bonus tickets)
create table if not exists public.lottery_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  month text not null,                 -- '2026-04'
  tickets int not null default 1,      -- weighted tickets for this entry
  source text not null default 'subscriber'
    check (source in ('subscriber', 'verified_purchase', 'review')),
  created_at timestamptz default now(),
  unique(user_id, month, source)
);

alter table public.lottery_entries enable row level security;

create policy "Users can read own entries"
  on public.lottery_entries for select
  using (auth.uid() = user_id);

create policy "Users can insert own entry"
  on public.lottery_entries for insert
  with check (auth.uid() = user_id);

-- ── 4. Lottery Config (admin-controlled) ──────────────
-- One row per month; admin sets budget / max winners / buyer-only mode.
create table if not exists public.lottery_config (
  month text primary key,              -- '2026-04'
  max_winners int default 3,           -- hard cap on free books
  winner_pct numeric(5,2) default 1.0, -- % of eligible pool
  buyers_only boolean default false,   -- require ≥1 verified purchase
  min_purchases int default 0,         -- min verified purchases in last 90 days
  created_at timestamptz default now()
);

alter table public.lottery_config enable row level security;
-- public read so the lottery page can show rules
create policy "Anyone can read config"
  on public.lottery_config for select
  using (true);

-- ── 5. Lottery Winners ───────────────────────────────
create table if not exists public.lottery_winners (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  month text not null,
  book_chosen text,                     -- book.id the winner picked
  shipping_name text,
  shipping_address text,
  claimed boolean default false,
  claim_deadline timestamptz,           -- 14 days from draw
  notified boolean default false,
  created_at timestamptz default now()
);

alter table public.lottery_winners enable row level security;

-- Winners can see their own record (to claim)
create policy "Users can read own wins"
  on public.lottery_winners for select
  using (auth.uid() = user_id);

-- Users can update their own claim (shipping info + book choice)
create policy "Users can claim own win"
  on public.lottery_winners for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Public-safe view: only month + display_name (no PII)
create or replace view public.lottery_winners_public as
  select
    w.month,
    w.book_chosen,
    p.display_name
  from public.lottery_winners w
  join public.profiles p on p.id = w.user_id
  where w.claimed = true or w.claim_deadline < now()
  order by w.month desc;
