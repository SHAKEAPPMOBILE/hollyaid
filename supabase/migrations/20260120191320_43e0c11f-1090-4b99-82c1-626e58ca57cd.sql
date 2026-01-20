-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Employees from paid companies can create bookings" ON public.bookings;

-- Create updated policy that allows both employees AND company admins to create bookings
CREATE POLICY "Employees from paid companies can create bookings" 
ON public.bookings 
FOR INSERT 
WITH CHECK (
  (employee_user_id = auth.uid()) AND (
    -- Either user is in company_employees with active subscription
    EXISTS (
      SELECT 1
      FROM company_employees ce
      JOIN companies c ON c.id = ce.company_id
      WHERE ce.user_id = auth.uid() AND c.subscription_status = 'active'
    )
    OR
    -- Or user is a company admin with active subscription
    EXISTS (
      SELECT 1
      FROM companies c
      WHERE c.admin_user_id = auth.uid() AND c.subscription_status = 'active'
    )
  )
);