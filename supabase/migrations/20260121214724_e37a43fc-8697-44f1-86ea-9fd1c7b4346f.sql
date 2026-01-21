-- Update the specialists_public view to include video_url
DROP VIEW IF EXISTS public.specialists_public;

CREATE VIEW public.specialists_public AS
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