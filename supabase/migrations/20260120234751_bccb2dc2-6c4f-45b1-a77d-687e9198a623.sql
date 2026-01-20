-- Add phone_number field to specialists table
ALTER TABLE public.specialists ADD COLUMN phone_number text;

-- Add phone_number field to profiles table (for employees)
ALTER TABLE public.profiles ADD COLUMN phone_number text;