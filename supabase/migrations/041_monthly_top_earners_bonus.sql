-- ══════════════════════════════════════════════════════════════
-- 041: Monthly top-earners bonus (C.5b)
-- ──────────────────────────────────────────────────────────────
-- On the 1st of each month a cron awards the previous month's
-- top 5 opted-in earners:
--   * +10 🥜 (credit_transactions.reason = 'top_earner_bonus')
--   * temporary badge 'top_earner_YYYY_MM' that expires at the
--     end of the month after the one they won (i.e. shown for
--     ~30 days after being awarded).
--
-- Safety:
--   * SECURITY DEFINER, search_path=''.
--   * Idempotent: badge UNIQUE(user_id, badge_type) and credit
--     insert gated by RETURNING id from the badge insert.
--   * Only awards users who are STILL opted in at award time.
--   * Uses same "earned" semantics as the leaderboard view:
--     positive credit_transactions rows, excluding reason='admin'
--     and excluding 'reversal'.
-- ══════════════════════════════════════════════════════════════

-- ─── 1. Add expires_at to profile_badges (nullable) ────────────
ALTER TABLE public.profile_badges
  ADD COLUMN IF NOT EXISTS expires_at timestamptz NULL;

COMMENT ON COLUMN public.profile_badges.expires_at IS
  'NULL = never expires. Set for temporary badges like top_earner_YYYY_MM.';

-- ─── 2. Extend badge_type CHECK to allow top_earner_YYYY_MM ───
-- Use a regex-compatible CHECK: specific set for existing types
-- plus a pattern for monthly top-earner badges.
ALTER TABLE public.profile_badges
  DROP CONSTRAINT IF EXISTS profile_badges_badge_type_check;

ALTER TABLE public.profile_badges
  ADD CONSTRAINT profile_badges_badge_type_check
  CHECK (
    badge_type IN (
      'frame_gold', 'frame_silver', 'top_reviewer', 'star_parent',
      'milestone_50', 'milestone_100', 'milestone_250',
      'milestone_500', 'milestone_1000'
    )
    OR badge_type ~ '^top_earner_[0-9]{4}_(0[1-9]|1[0-2])$'
  ) NOT VALID;

ALTER TABLE public.profile_badges
  VALIDATE CONSTRAINT profile_badges_badge_type_check;

-- ─── 3. Extend credit_transactions.reason CHECK ───────────────
ALTER TABLE public.credit_transactions
  DROP CONSTRAINT IF EXISTS credit_transactions_reason_check;

ALTER TABLE public.credit_transactions
  ADD CONSTRAINT credit_transactions_reason_check
  CHECK (reason IN (
    'review', 'share', 'download', 'admin', 'giveaway',
    'badge', 'boost', 'lottery_entry', 'ticket_purchase',
    'premium_download', 'reversal',
    'top_earner_bonus'
  )) NOT VALID;

ALTER TABLE public.credit_transactions
  VALIDATE CONSTRAINT credit_transactions_reason_check;

-- ─── 4. RPC: award_monthly_top_earners() ──────────────────────
-- Call with no args on the 1st of every month (via cron).
-- Awards the previous calendar month. Returns jsonb with counts.
CREATE OR REPLACE FUNCTION public.award_monthly_top_earners()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_now          timestamptz := now() AT TIME ZONE 'utc';
  v_prev_start   timestamptz;
  v_prev_end     timestamptz;
  v_badge_expiry timestamptz;
  v_badge_suffix text;
  v_badge_type   text;
  v_row          record;
  v_new_badge_id uuid;
  v_awarded      int := 0;
  v_skipped      int := 0;
  v_bonus_amount int := 10;
BEGIN
  v_prev_start := date_trunc('month', v_now - interval '1 month');
  v_prev_end   := date_trunc('month', v_now);  -- start of current month
  v_badge_expiry := date_trunc('month', v_now + interval '1 month');
  v_badge_suffix := to_char(v_prev_start, 'YYYY_MM');
  v_badge_type   := 'top_earner_' || v_badge_suffix;

  FOR v_row IN
    SELECT
      ct.user_id,
      SUM(ct.amount)::int AS peanuts_earned
    FROM public.credit_transactions ct
    JOIN public.profiles p ON p.id = ct.user_id
    WHERE ct.amount > 0
      AND ct.reason NOT IN ('admin', 'reversal')
      AND ct.created_at >= v_prev_start
      AND ct.created_at <  v_prev_end
      AND p.show_in_leaderboards = true
    GROUP BY ct.user_id
    ORDER BY SUM(ct.amount) DESC, MIN(ct.created_at) ASC
    LIMIT 5
  LOOP
    -- Per-user lock (reuse credits_ naming from other RPCs)
    PERFORM pg_advisory_xact_lock(hashtext('credits_' || v_row.user_id::text));

    INSERT INTO public.profile_badges (user_id, badge_type, active, expires_at)
    VALUES (v_row.user_id, v_badge_type, true, v_badge_expiry)
    ON CONFLICT (user_id, badge_type) DO NOTHING
    RETURNING id INTO v_new_badge_id;

    IF v_new_badge_id IS NOT NULL THEN
      INSERT INTO public.credit_transactions (user_id, amount, reason, ref_id)
      VALUES (v_row.user_id, v_bonus_amount, 'top_earner_bonus', v_new_badge_id);
      v_awarded := v_awarded + 1;
    ELSE
      v_skipped := v_skipped + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'month',    v_badge_suffix,
    'awarded',  v_awarded,
    'skipped',  v_skipped,
    'bonus',    v_bonus_amount,
    'expires_at', v_badge_expiry
  );
END;
$$;

COMMENT ON FUNCTION public.award_monthly_top_earners IS
  'Awards previous-month top 5 opted-in earners with +10 peanuts and a top_earner_YYYY_MM badge expiring at end of current month. Idempotent.';

REVOKE ALL ON FUNCTION public.award_monthly_top_earners() FROM public, anon, authenticated;
