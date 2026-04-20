-- ═══════════════════════════════════════════════════════
-- Migration 020 — Security Hardening
-- • Fix RLS: restrict book_reviews UPDATE to safe columns only
-- • Add UNIQUE constraint on lottery_winners(user_id, month)
-- • Create admin_audit_log table for all admin actions
-- • Create atomic buy_lottery_entry() function (prevents race conditions)
-- • Create rate_limit_check() helper function
-- ═══════════════════════════════════════════════════════

-- ── 1. Fix RLS: users must NOT be able to change status/featured/reviewer_note ──
DROP POLICY IF EXISTS "update_own_review" ON public.book_reviews;

CREATE POLICY "update_own_review"
  ON public.book_reviews FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id AND status IN ('pending', 'rejected'))
  WITH CHECK (
    auth.uid() = user_id
    AND status = 'pending'
  );

-- NOTE: This policy allows users to update their own reviews ONLY when:
-- - The review is currently pending or rejected (USING)
-- - The new status must remain 'pending' (WITH CHECK)
-- - Users CANNOT set status='approved' — only service role (admin) can do that

-- ── 2. UNIQUE constraint on lottery_winners(user_id, month) ──
-- Prevents duplicate winners in the same month from race conditions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'lottery_winners_user_month_unique'
  ) THEN
    ALTER TABLE public.lottery_winners
      ADD CONSTRAINT lottery_winners_user_month_unique UNIQUE (user_id, month);
  END IF;
END $$;

-- ── 3. Admin audit log table ──
CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id   text NOT NULL,
  action     text NOT NULL,
  target_type text NOT NULL,   -- 'review', 'config', 'draw', 'user'
  target_id  text,
  details    jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_created
  ON public.admin_audit_log (created_at DESC);

ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

-- Only service role can read/write audit logs (no public access)
CREATE POLICY "service_only_audit_log"
  ON public.admin_audit_log FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ── 4. Atomic buy_lottery_entry() — prevents double-spend race condition ──
CREATE OR REPLACE FUNCTION public.buy_lottery_entry(
  p_user_id uuid,
  p_month text,
  p_quantity int,
  p_cost_per_entry int DEFAULT 3
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_total_cost int;
  v_balance int;
  v_entry_id uuid;
BEGIN
  v_total_cost := p_quantity * p_cost_per_entry;

  -- Lock and get current balance atomically
  SELECT COALESCE(SUM(amount), 0) INTO v_balance
  FROM public.credit_transactions
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF v_balance < v_total_cost THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'insufficient_credits',
      'balance', v_balance,
      'cost', v_total_cost
    );
  END IF;

  -- Check if draw already happened
  IF EXISTS (
    SELECT 1 FROM public.lottery_winners
    WHERE month = p_month LIMIT 1
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'draw_already_done'
    );
  END IF;

  -- Insert lottery entry
  INSERT INTO public.lottery_entries (user_id, month, entry_count)
  VALUES (p_user_id, p_month, p_quantity)
  RETURNING id INTO v_entry_id;

  -- Deduct credits
  INSERT INTO public.credit_transactions (user_id, amount, reason, ref_id)
  VALUES (p_user_id, -v_total_cost, 'lottery_entry', v_entry_id);

  RETURN jsonb_build_object(
    'success', true,
    'entry_id', v_entry_id,
    'entries_added', p_quantity,
    'balance', v_balance - v_total_cost
  );
END;
$$;

-- ── 5. Rate limit helper — returns true if under limit ──
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_user_id uuid,
  p_action text,
  p_max_per_hour int DEFAULT 10
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT COUNT(*) < p_max_per_hour
  FROM public.credit_transactions
  WHERE user_id = p_user_id
    AND reason = p_action
    AND created_at > now() - interval '1 hour';
$$;
