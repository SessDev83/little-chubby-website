-- ╔══════════════════════════════════════════════════════╗
-- ║  015  User Notifications (in-app + email flag)      ║
-- ╚══════════════════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS public.user_notifications (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type       text NOT NULL DEFAULT 'info',          -- 'review_approved','review_rejected','lottery_win','peanut_earned','info'
  title_en   text NOT NULL DEFAULT '',
  title_es   text NOT NULL DEFAULT '',
  body_en    text NOT NULL DEFAULT '',
  body_es    text NOT NULL DEFAULT '',
  read       boolean NOT NULL DEFAULT false,
  emailed    boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notif_user ON public.user_notifications(user_id, read, created_at DESC);

-- RLS
ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own notifications"
  ON public.user_notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users update own notifications"
  ON public.user_notifications FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Only service role can INSERT (admin triggers / API)
CREATE POLICY "Service inserts notifications"
  ON public.user_notifications FOR INSERT
  WITH CHECK ((select auth.role()) = 'service_role');

-- Helper: create notification for a user
CREATE OR REPLACE FUNCTION notify_user(
  p_user_id uuid,
  p_type    text,
  p_title_en text,
  p_title_es text,
  p_body_en  text,
  p_body_es  text
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.user_notifications (user_id, type, title_en, title_es, body_en, body_es)
  VALUES (p_user_id, p_type, p_title_en, p_title_es, p_body_en, p_body_es);
END;
$$;

-- Auto-notify on review approval / rejection
CREATE OR REPLACE FUNCTION notify_review_status_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM 'approved' AND NEW.status = 'approved' THEN
    PERFORM notify_user(
      NEW.user_id,
      'review_approved',
      'Review Approved! 🎉',
      '¡Review Aprobada! 🎉',
      'Your review has been approved. You earned 5 🥜 Peanuts!',
      'Tu review ha sido aprobada. ¡Ganaste 5 🥜 Peanuts!'
    );
  ELSIF OLD.status != 'rejected' AND NEW.status = 'rejected' THEN
    PERFORM notify_user(
      NEW.user_id,
      'review_rejected',
      'Review Not Approved',
      'Review No Aprobada',
      CASE WHEN NULLIF(NEW.reviewer_note, '') IS NOT NULL
        THEN 'Reason: ' || NEW.reviewer_note
        ELSE 'Your review was not approved. You can edit and resubmit.'
      END,
      CASE WHEN NULLIF(NEW.reviewer_note, '') IS NOT NULL
        THEN 'Razón: ' || NEW.reviewer_note
        ELSE 'Tu review no fue aprobada. Puedes editarla y reenviarla.'
      END
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_review_status
  AFTER UPDATE OF status ON public.book_reviews
  FOR EACH ROW
  EXECUTE FUNCTION notify_review_status_change();
