-- Migration 022: Fix "FOR UPDATE is not allowed with aggregate functions"
-- PostgreSQL does not allow FOR UPDATE with sum().
-- Use pg_advisory_xact_lock (transaction-scoped) for concurrency safety instead.

-- ── Fix buy_tickets ──────────────────────────────────────
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

  -- Advisory lock scoped to this transaction (auto-released on commit/rollback)
  perform pg_advisory_xact_lock(hashtext('credits_' || p_user_id::text));

  select coalesce(sum(amount), 0) into v_peanut_balance
  from public.credit_transactions
  where user_id = p_user_id;

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

-- ── Fix enter_giveaway ───────────────────────────────────
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
  -- Advisory lock scoped to this transaction
  perform pg_advisory_xact_lock(hashtext('tickets_' || p_user_id::text));

  select coalesce(sum(amount), 0) into v_ticket_balance
  from public.ticket_transactions
  where user_id = p_user_id;

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
