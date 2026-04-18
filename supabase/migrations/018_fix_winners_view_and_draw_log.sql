-- 018: Fix lottery_winners_public — only show actually claimed prizes
-- Previously showed unclaimed expired entries as "winners"

DROP VIEW IF EXISTS public.lottery_winners_public;
CREATE VIEW public.lottery_winners_public
WITH (security_invoker = false) AS
  SELECT
    w.month,
    w.book_chosen,
    p.display_name,
    p.state,
    p.country,
    (
      coalesce(
        (select count(*) * 5 from public.book_reviews br
         where br.user_id = w.user_id and br.status = 'approved'),
      0)
      +
      coalesce(
        (select sum(le.entry_count) from public.lottery_entries le
         where le.user_id = w.user_id and le.month = w.month),
      0)
    )::int as total_tickets
  FROM public.lottery_winners w
  JOIN public.profiles p ON p.id = w.user_id
  WHERE w.claimed = true
  ORDER BY w.month DESC;

-- Also make drawn_by nullable text to support cron-auto-draw
ALTER TABLE public.lottery_draw_log
  DROP CONSTRAINT IF EXISTS lottery_draw_log_drawn_by_fkey;

ALTER TABLE public.lottery_draw_log
  ALTER COLUMN drawn_by TYPE text USING drawn_by::text;
