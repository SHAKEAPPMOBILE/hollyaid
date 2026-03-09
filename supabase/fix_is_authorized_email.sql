-- Run this in Supabase SQL Editor if the function is missing.
-- Then run: NOTIFY pgrst, 'reload schema';

CREATE OR REPLACE FUNCTION public.is_authorized_email(check_email TEXT)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM authorized_emails
    WHERE lower(email) = lower(trim(check_email))
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_authorized_email(TEXT) TO anon;
