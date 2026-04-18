-- 017: Extend lottery_winners_public view with location + ticket count

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
  WHERE w.claimed = true OR w.claim_deadline < now()
  ORDER BY w.month DESC;
