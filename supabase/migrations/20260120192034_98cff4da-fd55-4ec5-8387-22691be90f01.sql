-- Allow company admins to delete employee records
CREATE POLICY "Company admins can delete employees" 
ON public.company_employees 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1
    FROM companies
    WHERE companies.id = company_employees.company_id 
    AND companies.admin_user_id = auth.uid()
  )
);