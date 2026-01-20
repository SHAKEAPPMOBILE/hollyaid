-- Fix infinite recursion between companies <-> company_employees RLS by removing company_employees -> companies reference

-- 1) Security definer helper to check company admin without invoking RLS policies
CREATE OR REPLACE FUNCTION public.is_company_admin(_user_id uuid, _company_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.companies c
    WHERE c.id = _company_id
      AND c.admin_user_id = _user_id
  );
$$;

-- 2) Replace policies on company_employees that referenced companies (causing recursion)
DROP POLICY IF EXISTS "Company admins can manage employees" ON public.company_employees;
DROP POLICY IF EXISTS "Company admins can delete employees" ON public.company_employees;

CREATE POLICY "Company admins can manage employees"
ON public.company_employees
FOR ALL
USING (public.is_company_admin(auth.uid(), company_employees.company_id))
WITH CHECK (public.is_company_admin(auth.uid(), company_employees.company_id));

-- Optional explicit delete policy not needed because FOR ALL covers DELETE,
-- but keep a named one if other tooling expects it.
CREATE POLICY "Company admins can delete employees"
ON public.company_employees
FOR DELETE
USING (public.is_company_admin(auth.uid(), company_employees.company_id));
