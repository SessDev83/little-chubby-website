-- 027: User suspension support
-- Adds suspended flag to profiles for admin ban/suspend capability

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS suspended boolean NOT NULL DEFAULT false;

-- Partial index for fast middleware lookup (only indexes suspended users)
CREATE INDEX IF NOT EXISTS idx_profiles_suspended
  ON public.profiles (id) WHERE suspended = true;
