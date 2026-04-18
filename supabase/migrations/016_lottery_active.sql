-- 016: Active giveaway system
-- Adds fields to lottery_config so admin can toggle an active giveaway.

alter table public.lottery_config
  add column if not exists is_active boolean not null default false,
  add column if not exists draw_date date,
  add column if not exists prize_description text default '';
