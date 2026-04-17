-- Migration 012: Points / Credits system
-- Credits are earned by reviews (+5) and shares (+1, max 3/day)
-- Credits are spent on artwork downloads (-1 each)
-- Points also serve as giveaway entries in the future

-- ── Credit Transactions (ledger) ──────────────────────────
create table if not exists public.credit_transactions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  amount     int not null,                           -- +5 review, +1 share, -1 download
  reason     text not null check (reason in ('review','share','download','admin','giveaway')),
  ref_id     uuid,                                   -- FK to the review / share / artwork_download
  created_at timestamptz default now()
);

create index idx_credits_user on public.credit_transactions (user_id);

alter table public.credit_transactions enable row level security;

-- Users can read their own transactions
create policy "users_read_own_credits"
  on public.credit_transactions
  for select
  using (auth.uid() = user_id);

-- Only service role can insert (via API endpoints)
create policy "service_insert_credits"
  on public.credit_transactions
  for insert
  with check (auth.role() = 'service_role');

-- ── Helper function: get user balance ─────────────────────
create or replace function public.get_user_credits(p_user_id uuid)
returns int
language sql
stable
security definer
as $$
  select coalesce(sum(amount), 0)::int
  from public.credit_transactions
  where user_id = p_user_id;
$$;

-- ── Helper function: shares today count ───────────────────
create or replace function public.get_shares_today(p_user_id uuid)
returns int
language sql
stable
security definer
as $$
  select count(*)::int
  from public.credit_transactions
  where user_id = p_user_id
    and reason = 'share'
    and created_at::date = current_date;
$$;

-- ── Trigger: auto-grant 5 credits when review is approved ─
create or replace function public.grant_review_credits()
returns trigger
language plpgsql
security definer
as $$
begin
  -- Only fire when status changes to 'approved'
  if NEW.status = 'approved' and (OLD.status is null or OLD.status <> 'approved') then
    -- Check if credits were already granted for this review
    if not exists (
      select 1 from public.credit_transactions
      where user_id = NEW.user_id and reason = 'review' and ref_id = NEW.id
    ) then
      insert into public.credit_transactions (user_id, amount, reason, ref_id)
      values (NEW.user_id, 5, 'review', NEW.id);
    end if;
  end if;
  return NEW;
end;
$$;

-- Drop if exists to be safe, then create
drop trigger if exists trg_review_credits on public.book_reviews;
create trigger trg_review_credits
  after insert or update on public.book_reviews
  for each row
  execute function public.grant_review_credits();
