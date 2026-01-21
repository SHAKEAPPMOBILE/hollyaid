-- Allow specialists to view company info for employees they have bookings with
CREATE POLICY "Specialists can view companies for their bookings"
ON public.companies
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.bookings b
    JOIN public.company_employees ce ON ce.user_id = b.employee_user_id
    WHERE ce.company_id = companies.id
      AND public.is_specialist_owner(auth.uid(), b.specialist_id)
  )
);

-- Allow specialists to view company_employees for their bookings
CREATE POLICY "Specialists can view employee company links for their bookings"
ON public.company_employees
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.bookings b
    WHERE b.employee_user_id = company_employees.user_id
      AND public.is_specialist_owner(auth.uid(), b.specialist_id)
  )
);