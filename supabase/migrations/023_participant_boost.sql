-- 023: Add participant_boost to lottery_config
-- Allows admin to inflate the displayed participant count for social proof.
ALTER TABLE public.lottery_config
  ADD COLUMN IF NOT EXISTS participant_boost int NOT NULL DEFAULT 0;
