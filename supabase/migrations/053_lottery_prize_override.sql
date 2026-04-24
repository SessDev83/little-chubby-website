-- ═══════════════════════════════════════════════════════
-- 053: Optional override for monthly prize book
-- Allows admin to pin a specific book as the prize for a given month.
-- If NULL, auto-rotation via getMonthlyPrizeBook(month) applies.
-- Addresses LOTTERY-001 (master doc §III-D).
-- ═══════════════════════════════════════════════════════

alter table public.lottery_config
  add column if not exists prize_book_id text;

comment on column public.lottery_config.prize_book_id is
  'Optional override for the monthly prize book. NULL = auto-rotation (getMonthlyPrizeBook). Value = book.id from src/data/books.ts.';
