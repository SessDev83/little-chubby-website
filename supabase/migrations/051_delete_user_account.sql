-- Migration 051: Self-serve account deletion (GDPR Article 17 — right to erasure)
--
-- Strategy:
--   Most user-owned tables reference public.profiles(id) ON DELETE CASCADE,
--   and profiles.id references auth.users(id) ON DELETE CASCADE.
--   Therefore deleting auth.users(id) erases all user-scoped data automatically.
--
-- Manual extras:
--   - newsletter_subscribers is keyed by email (not by user_id) and must be
--     cleared separately so the address can resubscribe (and for GDPR).
--   - pending_gifts.claimed_by is ON DELETE SET NULL and is kept for the
--     sender's audit trail (not PII of the deleted user).
--
-- Safety:
--   SECURITY DEFINER so the RPC can touch auth.users. We validate that the
--   caller matches p_user_id (cannot delete other users). The caller must
--   pass their own email verbatim as p_confirm — acts as typed confirmation.
--
-- Returns jsonb { ok: true } on success, or raises an exception on failure.

create or replace function public.delete_user_account(
  p_user_id uuid,
  p_confirm text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_caller uuid;
  v_email  text;
begin
  v_caller := auth.uid();
  if v_caller is null or v_caller <> p_user_id then
    raise exception 'unauthorized' using errcode = '42501';
  end if;

  select email into v_email
    from auth.users
   where id = p_user_id;

  if v_email is null then
    raise exception 'user_not_found' using errcode = 'P0002';
  end if;

  -- Case-insensitive match so typing UPPERCASE or lowercase both work.
  if lower(coalesce(p_confirm, '')) <> lower(v_email) then
    raise exception 'confirm_mismatch' using errcode = '22023';
  end if;

  -- Email-keyed rows (no FK to user_id).
  delete from public.newsletter_subscribers
   where lower(email) = lower(v_email);

  -- Deleting auth user cascades through profiles and all user-scoped tables.
  delete from auth.users where id = p_user_id;

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.delete_user_account(uuid, text) from public, anon;
grant execute on function public.delete_user_account(uuid, text) to authenticated;

comment on function public.delete_user_account(uuid, text) is
  'GDPR Art. 17 self-serve account deletion. Caller must be p_user_id and pass their own email as p_confirm. Deletes auth.users row (cascades) and newsletter_subscribers by email.';
