-- ══════════════════════════════════════════════════════════════
-- 039: Gallery highlight (Tier 1 — 8 peanuts, 7 days)
-- ──────────────────────────────────────────────────────────────
-- Adds a new boost type 'highlight_7d' that a user can purchase
-- to promote ONE of their reviews on the home-page community
-- spotlight strip. Implemented as a reuse of the existing
-- gallery_boosts table (audit trail + expires_at already there)
-- with an extra partial unique index enforcing C-R11: at most
-- ONE active highlight per user at any time.
--
-- RPC: purchase_highlight(user_id, review_id, cost, days)
--   * Locks per-user via advisory lock.
--   * Rejects if user already has an active highlight on ANY of
--     their reviews (returns highlight_active_on_other + review_id).
--   * If called again on the SAME review while still active,
--     extends expires_at by p_duration_days (same UX as other
--     boosts, migration 033 pattern).
--   * Otherwise inserts a new row and deducts credits.
--
-- View: gallery_feed gains an is_highlighted column.
-- ══════════════════════════════════════════════════════════════

-- ─── 1. Safety net: trigger enforcing max 1 active highlight per user ─
-- (A partial UNIQUE INDEX with now() is not allowed because now() is not
--  IMMUTABLE. The primary guard lives in purchase_highlight() with an
--  advisory lock; this trigger is a belt-and-suspenders check.)
CREATE OR REPLACE FUNCTION public.trg_enforce_single_active_highlight()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.boost_type = 'highlight_7d' AND NEW.expires_at > now() THEN
    IF EXISTS (
      SELECT 1 FROM public.gallery_boosts
      WHERE user_id = NEW.user_id
        AND boost_type = 'highlight_7d'
        AND expires_at > now()
        AND id <> NEW.id
    ) THEN
      RAISE EXCEPTION 'highlight_active_on_other'
        USING ERRCODE = '23505';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_gallery_boosts_single_highlight ON public.gallery_boosts;

CREATE TRIGGER trg_gallery_boosts_single_highlight
BEFORE INSERT OR UPDATE ON public.gallery_boosts
FOR EACH ROW
EXECUTE FUNCTION public.trg_enforce_single_active_highlight();

-- Helper index for the view lookup.
CREATE INDEX IF NOT EXISTS idx_gallery_boosts_highlight_type
  ON public.gallery_boosts (user_id, expires_at)
  WHERE boost_type = 'highlight_7d';

-- ─── 2. purchase_highlight RPC ─────────────────────────────────
CREATE OR REPLACE FUNCTION public.purchase_highlight(
  p_user_id uuid,
  p_review_id uuid,
  p_cost int,
  p_duration_days int DEFAULT 7
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_balance int;
  v_boost_id uuid;
  v_existing_id uuid;
  v_existing_expires timestamptz;
  v_existing_review uuid;
  v_new_expires timestamptz;
  v_extended boolean := false;
  v_review_owner uuid;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('credits_' || p_user_id::text));

  -- Ownership check: user can only highlight their own reviews.
  SELECT user_id INTO v_review_owner
  FROM public.book_reviews
  WHERE id = p_review_id AND status = 'approved' AND show_in_gallery = true;

  IF v_review_owner IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'review_not_found');
  END IF;
  IF v_review_owner <> p_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_review_owner');
  END IF;

  -- Balance check.
  SELECT COALESCE(SUM(amount), 0) INTO v_balance
  FROM public.credit_transactions
  WHERE user_id = p_user_id;

  IF v_balance < p_cost THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'insufficient_credits',
      'balance', v_balance,
      'cost', p_cost
    );
  END IF;

  -- Look for any active highlight for this user.
  SELECT id, expires_at, review_id
    INTO v_existing_id, v_existing_expires, v_existing_review
  FROM public.gallery_boosts
  WHERE user_id = p_user_id
    AND boost_type = 'highlight_7d'
    AND expires_at > now()
  ORDER BY expires_at DESC
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    IF v_existing_review <> p_review_id THEN
      -- C-R11: block second concurrent highlight on a different review.
      RETURN jsonb_build_object(
        'success', false,
        'error', 'highlight_active_on_other',
        'active_review_id', v_existing_review,
        'expires_at', v_existing_expires
      );
    END IF;

    -- Extend same review.
    v_new_expires := v_existing_expires + (p_duration_days || ' days')::interval;
    UPDATE public.gallery_boosts
       SET expires_at = v_new_expires
     WHERE id = v_existing_id;
    v_boost_id := v_existing_id;
    v_extended := true;
  ELSE
    v_new_expires := now() + (p_duration_days || ' days')::interval;
    INSERT INTO public.gallery_boosts (review_id, user_id, boost_type, expires_at)
    VALUES (p_review_id, p_user_id, 'highlight_7d', v_new_expires)
    RETURNING id INTO v_boost_id;
  END IF;

  INSERT INTO public.credit_transactions (user_id, amount, reason, ref_id)
  VALUES (p_user_id, -p_cost, 'boost', v_boost_id);

  RETURN jsonb_build_object(
    'success', true,
    'boost_id', v_boost_id,
    'expires_at', v_new_expires,
    'balance', v_balance - p_cost,
    'extended', v_extended
  );
END;
$$;

COMMENT ON FUNCTION public.purchase_highlight IS
  'Buys or extends a 7-day highlight on a review for the home-page spotlight. Enforces max 1 active highlight per user (C-R11).';

-- ─── 3. Extend gallery_feed view with is_highlighted ───────────
DROP VIEW IF EXISTS public.gallery_feed;

CREATE VIEW public.gallery_feed
WITH (security_invoker = false) AS
  SELECT
    r.id,
    r.user_id,
    r.book_id,
    r.photo_url,
    r.extra_photos,
    r.rating,
    r.review_text,
    r.featured,
    r.submitted_at,
    CASE
      WHEN r.show_in_gallery
        THEN COALESCE(p.display_name, 'Reader')
      ELSE 'Anonymous'
    END AS display_name,
    EXISTS (
      SELECT 1 FROM public.gallery_boosts gb
      WHERE gb.review_id = r.id
        AND gb.boost_type = 'pin_7d'
        AND gb.expires_at > now()
    ) AS is_pinned,
    EXISTS (
      SELECT 1 FROM public.gallery_boosts gb
      WHERE gb.review_id = r.id
        AND gb.boost_type = 'gold_border'
        AND gb.expires_at > now()
    ) AS has_gold_border,
    EXISTS (
      SELECT 1 FROM public.gallery_boosts gb
      WHERE gb.review_id = r.id
        AND gb.boost_type = 'highlight_7d'
        AND gb.expires_at > now()
    ) AS is_highlighted
  FROM public.book_reviews r
  JOIN public.profiles p ON p.id = r.user_id
  WHERE r.status = 'approved'
    AND r.show_in_gallery = true
  ORDER BY
    EXISTS (
      SELECT 1 FROM public.gallery_boosts gb
      WHERE gb.review_id = r.id
        AND gb.boost_type = 'pin_7d'
        AND gb.expires_at > now()
    ) DESC,
    r.featured DESC,
    r.submitted_at DESC;

COMMENT ON VIEW public.gallery_feed IS
  'Public approved reviews with live boost flags (pinned/gold_border/highlighted) and author user_id.';
