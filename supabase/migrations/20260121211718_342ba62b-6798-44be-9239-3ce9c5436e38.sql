-- Add column to track onboarding tour completion per user
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS onboarding_completed_at timestamp with time zone DEFAULT NULL;

-- Add comment for clarity
COMMENT ON COLUMN public.profiles.onboarding_completed_at IS 'Timestamp when user completed the onboarding tour (null = not completed)';