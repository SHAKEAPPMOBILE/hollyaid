-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Authenticated users can view companies" ON public.companies;

-- Company admins can view their own company
CREATE POLICY "Company admins can view their company"
ON public.companies FOR SELECT
USING (auth.uid() = admin_user_id);

-- Employees can view their company
CREATE POLICY "Employees can view their company"
ON public.companies FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.company_employees
    WHERE company_id = companies.id
    AND user_id = auth.uid()
    AND status = 'accepted'
  )
);

-- Admins can view all companies
CREATE POLICY "Admins can view all companies"
ON public.companies FOR SELECT
USING (has_role(auth.uid(), 'admin'));