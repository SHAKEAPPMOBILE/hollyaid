-- Add policy for company admins to view active specialists (they can also use the platform as employees)
CREATE POLICY "Company admins can view active specialists"
ON public.specialists FOR SELECT
USING (
  is_active = true AND 
  EXISTS (
    SELECT 1 FROM public.companies
    WHERE companies.admin_user_id = auth.uid()
    AND companies.subscription_status = 'active'
  )
);

-- Add policy for paid company employees to view active specialists
CREATE POLICY "Paid company employees can view active specialists"
ON public.specialists FOR SELECT
USING (
  is_active = true AND
  EXISTS (
    SELECT 1 FROM public.company_employees ce
    JOIN public.companies c ON c.id = ce.company_id
    WHERE ce.user_id = auth.uid()
    AND c.subscription_status = 'active'
  )
);

-- Update availability_slots policy to also allow company admins
DROP POLICY IF EXISTS "Employees from paid companies can view available slots" ON public.availability_slots;

CREATE POLICY "Paid members can view available slots"
ON public.availability_slots FOR SELECT
USING (
  (EXISTS (
    SELECT 1 FROM public.company_employees ce
    JOIN public.companies c ON c.id = ce.company_id
    WHERE ce.user_id = auth.uid()
    AND c.subscription_status = 'active'
  ))
  OR 
  (EXISTS (
    SELECT 1 FROM public.companies
    WHERE companies.admin_user_id = auth.uid()
    AND companies.subscription_status = 'active'
  ))
  OR has_role(auth.uid(), 'admin'::app_role) 
  OR has_role(auth.uid(), 'specialist'::app_role)
);