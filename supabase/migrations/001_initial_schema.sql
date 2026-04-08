-- profiles table: extends Supabase auth.users
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text,
  lang_pref text default 'es' check (lang_pref in ('es', 'en')),
  is_admin boolean default false,
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;

-- Users can read their own profile
create policy "Users can read own profile"
  on public.profiles for select
  using (auth.uid() = id);

-- Users can update their own profile (but not is_admin)
create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Service role inserts profiles on signup (via trigger)
create policy "Service role can insert profiles"
  on public.profiles for insert
  with check (true);

-- Auto-create profile on user signup
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

-- lottery_entries table
create table if not exists public.lottery_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  month text not null, -- format: '2026-04'
  created_at timestamptz default now(),
  unique(user_id, month)
);

alter table public.lottery_entries enable row level security;

create policy "Users can read own entries"
  on public.lottery_entries for select
  using (auth.uid() = user_id);

create policy "Users can insert own entry"
  on public.lottery_entries for insert
  with check (auth.uid() = user_id);

-- lottery_winners table
create table if not exists public.lottery_winners (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  month text not null,
  book_title text,
  notified boolean default false,
  created_at timestamptz default now(),
  unique(month)
);

alter table public.lottery_winners enable row level security;

-- Anyone can see winners (public display)
create policy "Anyone can read winners"
  on public.lottery_winners for select
  using (true);

-- Admin-only policies (via service role, no RLS policy needed for insert/update/delete)
