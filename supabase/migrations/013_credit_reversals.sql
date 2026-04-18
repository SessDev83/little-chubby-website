-- Migration 013: Credit reversal triggers
-- 1. Revoke +5 credits when a review is DELETED
-- 2. Revoke +5 credits when a review status changes FROM 'approved' to 'rejected'

-- ── Trigger function: revoke credits on review deletion ───
create or replace function public.revoke_review_credits_on_delete()
returns trigger
language plpgsql
security definer
as $$
begin
  -- Only act if credits were previously granted for this review
  -- and no reversal has already been inserted (e.g. by the reject trigger)
  if exists (
    select 1 from public.credit_transactions
    where user_id = OLD.user_id
      and reason = 'review'
      and ref_id  = OLD.id
      and amount  = 5
  ) and not exists (
    select 1 from public.credit_transactions
    where user_id = OLD.user_id
      and reason = 'admin'
      and ref_id  = OLD.id
      and amount  = -5
  ) then
    insert into public.credit_transactions (user_id, amount, reason, ref_id)
    values (OLD.user_id, -5, 'admin', OLD.id);
  end if;
  return OLD;
end;
$$;

drop trigger if exists trg_revoke_credits_on_delete on public.book_reviews;
create trigger trg_revoke_credits_on_delete
  before delete on public.book_reviews
  for each row
  execute function public.revoke_review_credits_on_delete();

-- ── Trigger function: revoke credits when status changes approved → rejected ──
create or replace function public.revoke_review_credits_on_reject()
returns trigger
language plpgsql
security definer
as $$
begin
  if OLD.status = 'approved' and NEW.status = 'rejected' then
    -- Only if credits were granted and not yet revoked
    if exists (
      select 1 from public.credit_transactions
      where user_id = OLD.user_id
        and reason = 'review'
        and ref_id  = OLD.id
        and amount  = 5
    ) and not exists (
      select 1 from public.credit_transactions
      where user_id = OLD.user_id
        and reason = 'admin'
        and ref_id  = OLD.id
        and amount  = -5
    ) then
      insert into public.credit_transactions (user_id, amount, reason, ref_id)
      values (OLD.user_id, -5, 'admin', OLD.id);
    end if;
  end if;
  return NEW;
end;
$$;

drop trigger if exists trg_revoke_credits_on_reject on public.book_reviews;
create trigger trg_revoke_credits_on_reject
  before update on public.book_reviews
  for each row
  execute function public.revoke_review_credits_on_reject();
