-- Fix infinite recursion between specialists RLS and bookings RLS
-- Root cause: specialists policy references bookings, while bookings policy referenced specialists.

-- 1) Helper that checks if a given specialist_id belongs to the current user.
-- Use SECURITY DEFINER + row_security=off to avoid invoking RLS and creating recursion.
CREATE OR REPLACE FUNCTION public.is_specialist_owner(_user_id uuid, _specialist_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.specialists s
    WHERE s.id = _specialist_id
      AND s.user_id = _user_id
  );
$$;

-- 2) Replace bookings policies that joined specialists (recursion)
DROP POLICY IF EXISTS "Specialists can view their bookings" ON public.bookings;
DROP POLICY IF EXISTS "Specialists can update booking status" ON public.bookings;

CREATE POLICY "Specialists can view their bookings"
ON public.bookings
FOR SELECT
USING (public.is_specialist_owner(auth.uid(), bookings.specialist_id));

CREATE POLICY "Specialists can update booking status"
ON public.bookings
FOR UPDATE
USING (public.is_specialist_owner(auth.uid(), bookings.specialist_id));
