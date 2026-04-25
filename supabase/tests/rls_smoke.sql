-- RLS smoke test — pkg P2-11.2.
--
-- Runs via `supabase test db` against a fresh local Supabase (spun up by
-- `.github/workflows/rls-test.yml`).
--
-- Strategy:
--   1. Bootstrap two synthetic users in `auth.users` (the trigger
--      `on_auth_user_created` auto-inserts matching rows in `public.profiles`).
--   2. Seed one row of test data per table OWNED by user A, inserted as
--      superuser (bypasses RLS — that's fine; we only test the read path).
--   3. Switch role to `authenticated` and impersonate user B via the JWT
--      claim sub (this is what RLS policies key off via `auth.uid()`).
--   4. Assert the SELECT through the public table returns zero rows.
--
-- Failure here = real security regression. Gate stays hard.
--
-- Schema notes (audited 2026-04-25):
--   - profiles.id  IS  the user's auth.uid(); no separate user_id column.
--   - book_reviews has columns user_id/book_id/rating/status/photo_url/review_text;
--     pending reviews are private (read_own_reviews policy), only approved ones
--     are public (read_approved_reviews policy).
--   - The "tickets" concept lives in ticket_transactions (user_id/amount/reason);
--     legacy `lottery_tickets` table does NOT exist in this repo.

create extension if not exists pgtap;

begin;

select plan(3);

-- ─── Bootstrap: two synthetic users in auth.users ───
-- The trigger `on_auth_user_created` (migration 001) auto-inserts the
-- corresponding rows into public.profiles. Other auth.users columns have
-- defaults in supported Supabase CLI versions; we provide the minimal set
-- needed by the trigger (id, email) plus standard auth bookkeeping.
insert into auth.users (
  instance_id, id, aud, role, email,
  encrypted_password, email_confirmed_at, created_at, updated_at
) values
  ('00000000-0000-0000-0000-000000000000',
   '00000000-0000-0000-0000-0000000000aa',
   'authenticated', 'authenticated', 'a@test.local',
   '', now(), now(), now()),
  ('00000000-0000-0000-0000-000000000000',
   '00000000-0000-0000-0000-0000000000bb',
   'authenticated', 'authenticated', 'b@test.local',
   '', now(), now(), now())
on conflict (id) do nothing;

-- ─── Seed: rows owned by user A (inserted as superuser, bypassing RLS) ───
-- This is fine: RLS gates SELECT/UPDATE/DELETE/INSERT separately, and we
-- are testing the SELECT path under user B's identity.
insert into public.book_reviews
  (user_id, book_id, photo_url, rating, review_text, status)
values
  ('00000000-0000-0000-0000-0000000000aa', 'book_001',
   'https://example.test/photo.jpg', 5, 'Test review', 'pending')
on conflict (user_id, book_id) do nothing;

insert into public.ticket_transactions (user_id, amount, reason)
values ('00000000-0000-0000-0000-0000000000aa', 5, 'review_reward');

-- ─── Switch identity to user B via JWT claim sub + role authenticated ───
set local role authenticated;
set local "request.jwt.claim.sub" to '00000000-0000-0000-0000-0000000000bb';

-- Assertion 1: profiles are private — B cannot read A's profile.
select is_empty(
  $$ select id from public.profiles where id = '00000000-0000-0000-0000-0000000000aa' $$,
  'profiles RLS: user B cannot read user A''s profile'
);

-- Assertion 2: pending book_reviews are private — B cannot read A's pending review.
select is_empty(
  $$ select id from public.book_reviews
     where user_id = '00000000-0000-0000-0000-0000000000aa'
       and status = 'pending' $$,
  'book_reviews RLS: user B cannot read user A''s pending review'
);

-- Assertion 3: ticket_transactions are private — B cannot read A's ledger.
select is_empty(
  $$ select id from public.ticket_transactions
     where user_id = '00000000-0000-0000-0000-0000000000aa' $$,
  'ticket_transactions RLS: user B cannot read user A''s tickets'
);

select * from finish();
rollback;
