-- Ensure homepage visitors (anon) can read safe specialist preview fields.
-- This view intentionally exposes only non-sensitive profile information.
DROP VIEW IF EXISTS public.specialists_public;

CREATE VIEW public.specialists_public AS
SELECT
  id,
  full_name,
  specialty,
  bio,
  avatar_url,
  is_active,
  rate_tier,
  video_url,
  website
FROM public.specialists
WHERE is_active = true;

GRANT SELECT ON public.specialists_public TO anon, authenticated;
