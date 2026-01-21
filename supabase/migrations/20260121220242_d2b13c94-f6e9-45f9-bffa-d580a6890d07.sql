-- Recreate view with security_invoker to use caller's permissions
DROP VIEW IF EXISTS public.specialists_public;

CREATE VIEW public.specialists_public 
WITH (security_invoker = on)
AS
SELECT 
  id,
  full_name,
  specialty,
  bio,
  avatar_url,
  rate_tier,
  is_active,
  video_url
FROM public.specialists
WHERE is_active = true AND user_id IS NOT NULL;