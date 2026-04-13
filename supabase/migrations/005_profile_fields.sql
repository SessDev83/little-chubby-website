-- ═══════════════════════════════════════════════════════
-- 005: Extended profile fields (avatar, address, phone)
-- ═══════════════════════════════════════════════════════

alter table public.profiles
  add column if not exists avatar_url text,
  add column if not exists address_line1 text,
  add column if not exists address_line2 text,
  add column if not exists city text,
  add column if not exists state text,
  add column if not exists zip_code text,
  add column if not exists country text,
  add column if not exists phone text;
