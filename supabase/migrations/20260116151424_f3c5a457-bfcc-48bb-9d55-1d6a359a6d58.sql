-- Add specialist rate tier enum
CREATE TYPE public.specialist_rate_tier AS ENUM ('standard', 'advanced', 'expert', 'master');

-- Add rate_tier column to specialists table
ALTER TABLE public.specialists 
ADD COLUMN IF NOT EXISTS rate_tier specialist_rate_tier DEFAULT 'standard';

-- Add minute wallet columns to companies table
ALTER TABLE public.companies 
ADD COLUMN IF NOT EXISTS plan_type TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS minutes_included INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS minutes_used INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS subscription_period_start TIMESTAMP WITH TIME ZONE DEFAULT NULL,
ADD COLUMN IF NOT EXISTS subscription_period_end TIMESTAMP WITH TIME ZONE DEFAULT NULL,
ADD COLUMN IF NOT EXISTS is_test_account BOOLEAN DEFAULT FALSE;

-- Mark test accounts
UPDATE public.companies 
SET is_test_account = TRUE 
WHERE email_domain IN ('hollyaid.com', 'shakeapp.today');

-- Comment for clarity
COMMENT ON COLUMN public.companies.minutes_included IS 'Total minutes included in the monthly plan';
COMMENT ON COLUMN public.companies.minutes_used IS 'Minutes consumed this billing period';
COMMENT ON COLUMN public.companies.is_test_account IS 'Test accounts bypass Stripe payment';
COMMENT ON COLUMN public.specialists.rate_tier IS 'Specialist pricing tier: standard=$25/hr, advanced=$40/hr, expert=$60/hr, master=$80/hr';