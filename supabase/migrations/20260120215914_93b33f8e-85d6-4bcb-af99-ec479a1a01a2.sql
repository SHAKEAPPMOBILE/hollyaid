-- Add job_title column to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS job_title text;

-- Add department column (for organizational context)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS department text;