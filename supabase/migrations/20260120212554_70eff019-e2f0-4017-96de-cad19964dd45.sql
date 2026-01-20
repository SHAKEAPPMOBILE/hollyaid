-- Create a public view for specialists that excludes sensitive data
CREATE VIEW public.specialists_public
WITH (security_invoker=on) AS
SELECT 
  id,
  full_name,
  specialty,
  bio,
  avatar_url,
  is_active,
  rate_tier
FROM public.specialists
WHERE is_active = true;

-- Grant access to authenticated users
GRANT SELECT ON public.specialists_public TO authenticated;

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Anyone authenticated can view active specialists" ON public.specialists;

-- Create a restrictive policy - only admins and the specialist themselves can view the full table
CREATE POLICY "Admins can view all specialists"
ON public.specialists FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Specialists can view their own record"
ON public.specialists FOR SELECT
USING (user_id = auth.uid());

-- Specialists linked to bookings can be viewed by the booking employee (for booking details only)
CREATE POLICY "Employees can view specialists for their bookings"
ON public.specialists FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.bookings
    WHERE bookings.specialist_id = specialists.id
    AND bookings.employee_user_id = auth.uid()
  )
);