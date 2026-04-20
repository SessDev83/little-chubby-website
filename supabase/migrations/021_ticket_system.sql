-- Migration 021: Ticket balance system
-- Decouples ticket purchasing from lottery entry.
-- Users accumulate tickets (from reviews + peanuts) and spend them on specific giveaways.

-- ── Ticket Transactions ──────────────────────────────────
-- Mirrors credit_transactions but for tickets.
-- Reasons: 'review_reward', 'peanut_purchase', 'giveaway_entry', 'admin'
create table if not exists public.ticket_transactions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  amount      int not null,
  reason      text not null check (reason in (
    'review_reward', 'peanut_purchase', 'giveaway_entry', 'admin'
  )),
  ref_id      uuid,
  created_at  timestamptz default now()
);

create index idx_ticket_tx_user on public.ticket_transactions (user_id);
create index idx_ticket_tx_ref  on public.ticket_transactions (ref_id) where ref_id is not null;

alter table public.ticket_transactions enable row level security;

-- Users can read their own ticket transactions
create policy "users_read_own_ticket_tx"
  on public.ticket_transactions for select
  using (auth.uid() = user_id);

-- Only service role can insert
create policy "service_insert_ticket_tx"
  on public.ticket_transactions for insert
  with check (auth.role() = 'service_role');

-- ── Get ticket balance ───────────────────────────────────
create or replace function public.get_user_tickets(p_user_id uuid)
returns int
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(sum(amount), 0)::int
  from public.ticket_transactions
  where user_id = p_user_id;
$$;

-- ── Buy tickets with peanuts (atomic) ────────────────────
-- Deducts peanuts, credits tickets.
create or replace function public.buy_tickets(
  p_user_id uuid,
  p_quantity int,
  p_cost_per_ticket int default 3
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_total_cost int;
  v_peanut_balance int;
  v_ticket_tx_id uuid;
begin
  v_total_cost := p_quantity * p_cost_per_ticket;

  -- Lock and get peanut balance
  select coalesce(sum(amount), 0) into v_peanut_balance
  from public.credit_transactions
  where user_id = p_user_id
  for update;

  if v_peanut_balance < v_total_cost then
    return jsonb_build_object(
      'success', false,
      'error', 'insufficient_credits',
      'balance', v_peanut_balance,
      'cost', v_total_cost
    );
  end if;

  -- Credit tickets
  insert into public.ticket_transactions (user_id, amount, reason)
  values (p_user_id, p_quantity, 'peanut_purchase')
  returning id into v_ticket_tx_id;

  -- Deduct peanuts
  insert into public.credit_transactions (user_id, amount, reason, ref_id)
  values (p_user_id, -v_total_cost, 'ticket_purchase', v_ticket_tx_id);

  return jsonb_build_object(
    'success', true,
    'tickets_added', p_quantity,
    'peanut_balance', v_peanut_balance - v_total_cost,
    'ticket_balance', (select coalesce(sum(amount), 0)::int from public.ticket_transactions where user_id = p_user_id)
  );
end;
$$;

-- ── Enter giveaway with tickets (atomic) ─────────────────
-- Deducts tickets, creates lottery_entries for the given month.
create or replace function public.enter_giveaway(
  p_user_id uuid,
  p_month text,
  p_quantity int
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ticket_balance int;
  v_entry_id uuid;
begin
  -- Lock and get ticket balance
  select coalesce(sum(amount), 0) into v_ticket_balance
  from public.ticket_transactions
  where user_id = p_user_id
  for update;

  if v_ticket_balance < p_quantity then
    return jsonb_build_object(
      'success', false,
      'error', 'insufficient_tickets',
      'ticket_balance', v_ticket_balance
    );
  end if;

  -- Check if draw already happened
  if exists (
    select 1 from public.lottery_winners
    where month = p_month limit 1
  ) then
    return jsonb_build_object(
      'success', false,
      'error', 'draw_already_done'
    );
  end if;

  -- Insert lottery entry
  insert into public.lottery_entries (user_id, month, entry_count)
  values (p_user_id, p_month, p_quantity)
  returning id into v_entry_id;

  -- Deduct tickets
  insert into public.ticket_transactions (user_id, amount, reason, ref_id)
  values (p_user_id, -p_quantity, 'giveaway_entry', v_entry_id);

  return jsonb_build_object(
    'success', true,
    'entry_id', v_entry_id,
    'entries_added', p_quantity,
    'ticket_balance', v_ticket_balance - p_quantity
  );
end;
$$;

-- ── Award review tickets (idempotent) ────────────────────
-- Called when admin approves a review. Awards 5 tickets if not already awarded.
create or replace function public.award_review_tickets(
  p_user_id uuid,
  p_review_id uuid,
  p_tickets int default 5
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Check if already awarded for this review
  if exists (
    select 1 from public.ticket_transactions
    where user_id = p_user_id
      and reason = 'review_reward'
      and ref_id = p_review_id
  ) then
    return jsonb_build_object('success', true, 'already_awarded', true);
  end if;

  insert into public.ticket_transactions (user_id, amount, reason, ref_id)
  values (p_user_id, p_tickets, 'review_reward', p_review_id);

  return jsonb_build_object(
    'success', true,
    'already_awarded', false,
    'tickets_awarded', p_tickets,
    'ticket_balance', (select coalesce(sum(amount), 0)::int from public.ticket_transactions where user_id = p_user_id)
  );
end;
$$;

-- ── Update credit_transactions reason constraint to allow 'ticket_purchase' ──
alter table public.credit_transactions
  drop constraint if exists credit_transactions_reason_check;

alter table public.credit_transactions
  add constraint credit_transactions_reason_check
  check (reason in (
    'review', 'share', 'download', 'admin', 'giveaway',
    'badge', 'boost', 'lottery_entry', 'ticket_purchase',
    'premium_download', 'reversal'
  ));

-- ── Retroactive: award tickets for existing approved reviews ──
-- This ensures existing users don't lose their tickets.
insert into public.ticket_transactions (user_id, amount, reason, ref_id)
select user_id, 5, 'review_reward', id
from public.book_reviews
where status = 'approved'
  and id not in (
    select ref_id from public.ticket_transactions
    where reason = 'review_reward' and ref_id is not null
  );

-- ── Retroactive: convert existing lottery_entries into ticket spends ──
-- Users who already purchased lottery entries should have matching ticket debits.
-- First, give them the tickets they "had" (from peanut purchases),
-- then deduct them (giveaway_entry).
-- This way their ticket balance is 0 for already-spent entries, which is correct.
insert into public.ticket_transactions (user_id, amount, reason, ref_id)
select user_id, entry_count, 'peanut_purchase', id
from public.lottery_entries;

insert into public.ticket_transactions (user_id, amount, reason, ref_id)
select user_id, -entry_count, 'giveaway_entry', id
from public.lottery_entries;
