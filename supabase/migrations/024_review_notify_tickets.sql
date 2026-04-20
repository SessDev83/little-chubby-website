-- ═══════════════════════════════════════════════════════════════
-- Reviews give TICKETS only (not Peanuts).
-- Peanuts are earned by sharing content.
-- ═══════════════════════════════════════════════════════════════

-- 1) Drop the trigger that auto-grants 5 peanuts on review approval (from 012)
DROP TRIGGER IF EXISTS trg_review_credits ON public.book_reviews;
DROP FUNCTION IF EXISTS public.grant_review_credits();

-- 2) Drop the trigger that revokes peanuts when a review is deleted (from 013)
DROP TRIGGER IF EXISTS trg_revoke_credits_on_delete ON public.book_reviews;
DROP FUNCTION IF EXISTS public.revoke_review_credits_on_delete();

-- 3) Drop the trigger that revokes peanuts when status changes approved→rejected (from 013)
DROP TRIGGER IF EXISTS trg_revoke_credits_on_reject ON public.book_reviews;
DROP FUNCTION IF EXISTS public.revoke_review_credits_on_reject();

-- 4) Update the in-app notification to mention only Tickets
CREATE OR REPLACE FUNCTION notify_review_status_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM 'approved' AND NEW.status = 'approved' THEN
    PERFORM notify_user(
      NEW.user_id,
      'review_approved',
      'Review Approved! 🎉',
      '¡Review Aprobada! 🎉',
      'Your review has been approved. You earned 5 🎟️ Tickets for the Giveaway!',
      'Tu review ha sido aprobada. ¡Ganaste 5 🎟️ Tickets para el Sorteo!'
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
