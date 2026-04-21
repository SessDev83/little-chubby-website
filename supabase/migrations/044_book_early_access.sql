-- =============================================================
-- Migration 044: Early access to upcoming books (Phase D.3)
-- =============================================================
-- • Admin configures upcoming books with a release_at timestamp and
--   an optional early-access URL (preview PDF, sneak-peek page, etc).
-- • During the 7 days before release_at, authenticated users can
--   spend 20 🥜 to unlock the book. After release_at, early access
--   is no longer for sale (the book is simply published).
-- • Defense-in-depth: the 7-day window is enforced server-side in
--   the RPC (master plan D-R2). Clients also filter but the RPC is
--   authoritative.
-- =============================================================

-- 1. Catalog of upcoming books --------------------------------

CREATE TABLE IF NOT EXISTS public.book_early_access_config (
  book_id           text PRIMARY KEY,      -- matches src/data/books.ts id
  release_at        timestamptz NOT NULL,  -- public release moment
  early_access_url  text,                  -- optional preview link
  title_es          text,
  title_en          text,
  cover_src         text,
  created_at        timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.book_early_access_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ea_config public read" ON public.book_early_access_config;
CREATE POLICY "ea_config public read"
  ON public.book_early_access_config
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- 2. Per-user unlocks -----------------------------------------

CREATE TABLE IF NOT EXISTS public.book_early_access_unlocks (
  user_id      uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  book_id      text NOT NULL,
  unlocked_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, book_id)
);

CREATE INDEX IF NOT EXISTS ea_unlocks_user_idx
  ON public.book_early_access_unlocks (user_id);

ALTER TABLE public.book_early_access_unlocks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ea_unlocks read own" ON public.book_early_access_unlocks;
CREATE POLICY "ea_unlocks read own"
  ON public.book_early_access_unlocks
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Only service role writes (via RPC).

-- 3. Extend credit_transactions reason allowlist --------------

ALTER TABLE public.credit_transactions
  DROP CONSTRAINT IF EXISTS credit_transactions_reason_check;

ALTER TABLE public.credit_transactions
  ADD CONSTRAINT credit_transactions_reason_check
  CHECK (reason IN (
    'review','share','download','admin','giveaway','badge','boost',
    'lottery_entry','ticket_purchase','premium_download','reversal',
    'top_earner_bonus','early_access'
  )) NOT VALID;

ALTER TABLE public.credit_transactions
  VALIDATE CONSTRAINT credit_transactions_reason_check;

-- 4. RPC: purchase_early_access -------------------------------

CREATE OR REPLACE FUNCTION public.purchase_early_access(
  p_user_id uuid,
  p_book_id text,
  p_cost    int DEFAULT 20
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_config   public.book_early_access_config%ROWTYPE;
  v_balance  int;
  v_now      timestamptz := now();
BEGIN
  IF p_user_id IS NULL OR p_book_id IS NULL OR length(p_book_id) = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_input');
  END IF;
  IF p_cost IS NULL OR p_cost < 1 OR p_cost > 1000 THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_cost');
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('credits_' || p_user_id::text));

  SELECT * INTO v_config
    FROM public.book_early_access_config
    WHERE book_id = p_book_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'book_not_found');
  END IF;

  -- Server-side window: available 7 days BEFORE release_at, closed at release (D-R2).
  IF v_now < (v_config.release_at - interval '7 days') OR v_now >= v_config.release_at THEN
    RETURN jsonb_build_object('success', false, 'error', 'early_access_closed');
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.book_early_access_unlocks
    WHERE user_id = p_user_id AND book_id = p_book_id
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'already_owned');
  END IF;

  SELECT COALESCE(SUM(amount), 0)::int INTO v_balance
    FROM public.credit_transactions
    WHERE user_id = p_user_id;

  IF v_balance < p_cost THEN
    RETURN jsonb_build_object(
      'success', false,
      'error',   'insufficient_credits',
      'balance', v_balance,
      'needed',  p_cost
    );
  END IF;

  INSERT INTO public.book_early_access_unlocks (user_id, book_id, unlocked_at)
    VALUES (p_user_id, p_book_id, v_now)
    ON CONFLICT (user_id, book_id) DO NOTHING;

  INSERT INTO public.credit_transactions (user_id, amount, reason)
    VALUES (p_user_id, -p_cost, 'early_access');

  RETURN jsonb_build_object(
    'success', true,
    'book_id', p_book_id,
    'balance', v_balance - p_cost
  );
END;
$$;

REVOKE ALL ON FUNCTION public.purchase_early_access(uuid, text, int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.purchase_early_access(uuid, text, int) TO authenticated;

COMMENT ON FUNCTION public.purchase_early_access IS
  'Unlock a book 7 days before public release for 20 peanuts. Window and cost are enforced server-side (master plan D.3/D-R2).';
