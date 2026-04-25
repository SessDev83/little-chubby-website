-- Migration 054: Extend credit_transactions.reason whitelist to include 'avatar_upload'
-- Used as rate-limit accounting marker (amount=0, no balance impact).
-- See: docs-internal/implementation-packages/P0-02-security-quickwins.md

ALTER TABLE public.credit_transactions
  DROP CONSTRAINT IF EXISTS credit_transactions_reason_check;

ALTER TABLE public.credit_transactions
  ADD CONSTRAINT credit_transactions_reason_check
  CHECK (reason IN (
    'review','share','download','admin','giveaway','badge','boost',
    'lottery_entry','ticket_purchase','premium_download','reversal',
    'top_earner_bonus','early_access','avatar_upload'
  )) NOT VALID;

ALTER TABLE public.credit_transactions
  VALIDATE CONSTRAINT credit_transactions_reason_check;
