-- Migration 028: Atomic purchase functions for download, badge, and boost
-- Eliminates TOCTOU race conditions (check-then-act on separate queries)
-- Pattern: pg_advisory_xact_lock → check balance → insert item → deduct credits (all atomic)

-- ══════════════════════════════════════════════════════════
-- 1. Atomic download_artwork
-- ══════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.purchase_download(
  p_user_id uuid,
  p_artwork_id uuid,
  p_cost int
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_balance int;
  v_dl_id uuid;
BEGIN
  -- Advisory lock per-user to prevent concurrent double-spend
  PERFORM pg_advisory_xact_lock(hashtext('credits_' || p_user_id::text));

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

  -- Record download
  INSERT INTO public.artwork_downloads (user_id, artwork_id)
  VALUES (p_user_id, p_artwork_id)
  RETURNING id INTO v_dl_id;

  -- Deduct credits
  INSERT INTO public.credit_transactions (user_id, amount, reason, ref_id)
  VALUES (p_user_id, -p_cost, 'download', p_artwork_id);

  RETURN jsonb_build_object(
    'success', true,
    'download_id', v_dl_id,
    'balance', v_balance - p_cost
  );
END;
$$;

-- ══════════════════════════════════════════════════════════
-- 2. Atomic purchase_badge
-- ══════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.purchase_badge(
  p_user_id uuid,
  p_badge_type text,
  p_cost int
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_balance int;
  v_badge_id uuid;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('credits_' || p_user_id::text));

  -- Check if already owned
  IF EXISTS (
    SELECT 1 FROM public.profile_badges
    WHERE user_id = p_user_id AND badge_type = p_badge_type AND active = true
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'already_owned'
    );
  END IF;

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

  -- Insert badge
  INSERT INTO public.profile_badges (user_id, badge_type)
  VALUES (p_user_id, p_badge_type)
  RETURNING id INTO v_badge_id;

  -- Deduct credits
  INSERT INTO public.credit_transactions (user_id, amount, reason, ref_id)
  VALUES (p_user_id, -p_cost, 'badge', v_badge_id);

  RETURN jsonb_build_object(
    'success', true,
    'badge_id', v_badge_id,
    'balance', v_balance - p_cost
  );
END;
$$;

-- ══════════════════════════════════════════════════════════
-- 3. Atomic purchase_boost
-- ══════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.purchase_boost(
  p_user_id uuid,
  p_review_id uuid,
  p_boost_type text,
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
  v_expires_at timestamptz;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('credits_' || p_user_id::text));

  -- Check for existing active boost of same type
  IF EXISTS (
    SELECT 1 FROM public.gallery_boosts
    WHERE review_id = p_review_id
      AND boost_type = p_boost_type
      AND expires_at > now()
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'boost_active'
    );
  END IF;

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

  v_expires_at := now() + (p_duration_days || ' days')::interval;

  -- Insert boost
  INSERT INTO public.gallery_boosts (review_id, user_id, boost_type, expires_at)
  VALUES (p_review_id, p_user_id, p_boost_type, v_expires_at)
  RETURNING id INTO v_boost_id;

  -- Deduct credits
  INSERT INTO public.credit_transactions (user_id, amount, reason, ref_id)
  VALUES (p_user_id, -p_cost, 'boost', v_boost_id);

  RETURN jsonb_build_object(
    'success', true,
    'boost_id', v_boost_id,
    'expires_at', v_expires_at,
    'balance', v_balance - p_cost
  );
END;
$$;

-- ══════════════════════════════════════════════════════════
-- 4. Rate limit for newsletter subscribe (IP-based)
-- ══════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.check_subscribe_rate_limit(
  p_ip text,
  p_max_per_hour int DEFAULT 5
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT COUNT(*) < p_max_per_hour
  FROM public.newsletter_subscribers
  WHERE created_at > now() - interval '1 hour';
$$;
