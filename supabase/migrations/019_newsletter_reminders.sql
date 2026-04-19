-- Migration 019: Add reminder tracking columns to newsletter_subscribers
-- Supports the drip email sequence for unconfirmed subscribers

alter table public.newsletter_subscribers
  add column if not exists reminder_count  int         default 0,
  add column if not exists last_reminder_at timestamptz default null;
