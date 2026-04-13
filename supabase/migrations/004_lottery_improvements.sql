-- ═══════════════════════════════════════════════════════
-- Migration 004 — Lottery Improvements
-- • Audit trail table for draws
-- • RLS policies for user update/delete own reviews
-- ═══════════════════════════════════════════════════════

-- ── Draw Audit Log ───────────────────────────────────
CREATE TABLE IF NOT EXISTS public.lottery_draw_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  month text NOT NULL,
  config_snapshot jsonb NOT NULL DEFAULT '{}',
  eligible_users int NOT NULL DEFAULT 0,
  total_tickets int NOT NULL DEFAULT 0,
  winners_drawn int NOT NULL DEFAULT 0,
  drawn_by uuid REFERENCES public.profiles(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.lottery_draw_log ENABLE ROW LEVEL SECURITY;

-- Only admins (via service role) can read/write draw logs
-- No public access needed

-- ── Allow users to update their own pending/rejected reviews ─
CREATE POLICY "update_own_review"
  ON public.book_reviews FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── Allow users to delete their own reviews ─────────
CREATE POLICY "delete_own_review"
  ON public.book_reviews FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ── Refresh gallery_feed view to include review id for anchors ─
CREATE OR REPLACE VIEW public.gallery_feed
WITH (security_invoker = false) AS
  SELECT
    r.id,
    r.book_id,
    r.photo_url,
    r.rating,
    r.review_text,
    r.featured,
    r.submitted_at,
    CASE
      WHEN r.show_in_gallery
        THEN COALESCE(p.display_name, 'Reader')
      ELSE 'Anonymous'
    END AS display_name
  FROM public.book_reviews r
  JOIN public.profiles p ON p.id = r.user_id
  WHERE r.status = 'approved'
  ORDER BY r.featured DESC, r.submitted_at DESC;
