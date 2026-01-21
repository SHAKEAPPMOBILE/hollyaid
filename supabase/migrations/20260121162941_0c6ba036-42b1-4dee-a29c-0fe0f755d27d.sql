-- Allow specialists to read limited employee profile info for users they have bookings with
-- This fixes "Unknown employee" appearing in specialist booking requests/history.

CREATE POLICY "Specialists can view employee profiles for their bookings"
ON public.profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.bookings b
    WHERE b.employee_user_id = profiles.user_id
      AND public.is_specialist_owner(auth.uid(), b.specialist_id)
  )
);
