-- Migration 052: Parental consent gate (COPPA / GDPR safeguard)
--
-- Design:
--   - Account holders must be adults (18+) managing the account for their
--     family. We do NOT collect any data about children (no age, no name,
--     no birth year). The only thing we store is a timestamp of when the
--     adult confirmed the gate.
--   - NEW signups: the register form requires a checkbox before hitting
--     supabase.auth.signUp; we pass the confirmation via options.data and
--     handle_new_user() carries it over to profiles.parent_consent_at.
--   - EXISTING users: profiles.parent_consent_at starts NULL; a soft
--     non-blocking banner on authenticated pages lets them confirm. The
--     RPC confirm_parental_consent() writes the timestamp once.

alter table public.profiles
  add column if not exists parent_consent_at timestamptz null;

comment on column public.profiles.parent_consent_at is
  'Timestamp of the adult account holder confirming they are 18+ and managing the account for their family. NULL means the gate has not been confirmed yet (legacy users created before migration 052).';

-- Extend handle_new_user() so the timestamp provided in signUp().options.data
-- is persisted to the profile row on creation.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_consent timestamptz;
begin
  begin
    v_consent := (new.raw_user_meta_data->>'parent_consent_at')::timestamptz;
  exception when others then
    v_consent := null;
  end;

  insert into public.profiles (id, email, parent_consent_at)
  values (new.id, new.email, v_consent);
  return new;
end;
$$;

-- Retroactive confirmation RPC for existing users (non-blocking banner).
create or replace function public.confirm_parental_consent()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'unauthorized' using errcode = '42501';
  end if;

  update public.profiles
     set parent_consent_at = coalesce(parent_consent_at, now())
   where id = v_uid;

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.confirm_parental_consent() from public, anon;
grant execute on function public.confirm_parental_consent() to authenticated;

comment on function public.confirm_parental_consent() is
  'Called from the soft parental-consent banner. Writes parent_consent_at=now() for the caller, idempotent (coalesce).';
