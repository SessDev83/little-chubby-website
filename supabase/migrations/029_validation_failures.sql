-- ─── Social Post Validation Failures ────────────────────────────────────────
-- Records posts that were blocked by the deterministic validator gate
-- (scripts/social/validate-post.mjs) AND failed the one-shot retry.
-- Used for post-mortem analysis, prompt drift detection, and rule tuning.
-- See GROWTH_CONTENT_PLAYBOOK.md §11 — Retry contract.

CREATE TABLE IF NOT EXISTS public.validation_failures (
    id              bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    ts              timestamptz NOT NULL DEFAULT now(),
    post_type       text NOT NULL,           -- free-coloring | share-earn | tag-a-friend | community | book-promo | ...
    lang            text NOT NULL,           -- en | es
    first_attempt   jsonb NOT NULL DEFAULT '{}',
    retry_attempt   jsonb NOT NULL DEFAULT '{}',
    concept         text,                    -- Claude's stated concept for the post
    creative_id     text,                    -- utm_content creativeId
    flywheel_stage  smallint,                -- 1..5
    reason          text NOT NULL DEFAULT 'retry_blocked'
);

CREATE INDEX idx_validation_failures_ts
    ON public.validation_failures (ts DESC);

CREATE INDEX idx_validation_failures_type_lang
    ON public.validation_failures (post_type, lang, ts DESC);

-- Quick helper view: last 50 failures with short-form summary.
CREATE OR REPLACE VIEW public.validation_failures_recent AS
SELECT
    id,
    ts,
    post_type,
    lang,
    concept,
    creative_id,
    flywheel_stage,
    reason,
    jsonb_array_length(COALESCE(first_attempt->'violations', '[]'::jsonb))
        AS first_attempt_violation_count,
    jsonb_array_length(COALESCE(retry_attempt->'violations', '[]'::jsonb))
        AS retry_violation_count
FROM public.validation_failures
ORDER BY ts DESC
LIMIT 50;

-- RLS: service role only.
ALTER TABLE public.validation_failures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on validation_failures"
    ON public.validation_failures
    FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

COMMENT ON TABLE public.validation_failures IS
    'Blocked social posts that also failed retry. Source: scripts/social/post.mjs -> logValidationFailure(). See playbook §11.';
