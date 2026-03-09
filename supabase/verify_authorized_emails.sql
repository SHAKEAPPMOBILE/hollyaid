-- Run this in Supabase SQL Editor to verify the function exists.
-- If it returns one row, the function is there. If empty, run the migration below.

SELECT routine_schema, routine_name
FROM information_schema.routines
WHERE routine_schema = 'public' AND routine_name = 'is_authorized_email';

-- Quick test call (optional):
-- SELECT public.is_authorized_email('contact@shakeapp.today');
