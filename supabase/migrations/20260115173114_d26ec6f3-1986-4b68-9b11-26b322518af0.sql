-- Add invitation_token and invitation_sent_at to specialists table for specialist login system
ALTER TABLE public.specialists 
ADD COLUMN IF NOT EXISTS invitation_token UUID DEFAULT gen_random_uuid(),
ADD COLUMN IF NOT EXISTS invitation_sent_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS invitation_accepted_at TIMESTAMP WITH TIME ZONE;

-- Add stripe_subscription_id and subscription_status to companies table
ALTER TABLE public.companies
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'unpaid';

-- Update company_employees to support auto-join
ALTER TABLE public.company_employees
ADD COLUMN IF NOT EXISTS auto_joined BOOLEAN DEFAULT false;

-- Create RLS policy for specialists to insert their own user_id when accepting invitation
CREATE POLICY "Specialists can accept invitations by updating user_id"
ON public.specialists
FOR UPDATE
USING (
  email = (SELECT profiles.email FROM profiles WHERE profiles.user_id = auth.uid())
)
WITH CHECK (
  email = (SELECT profiles.email FROM profiles WHERE profiles.user_id = auth.uid())
);

-- Update bookings RLS to allow employees from paid companies to create bookings
DROP POLICY IF EXISTS "Employees can create bookings" ON public.bookings;
CREATE POLICY "Employees from paid companies can create bookings"
ON public.bookings
FOR INSERT
WITH CHECK (
  employee_user_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM company_employees ce
    JOIN companies c ON c.id = ce.company_id
    WHERE ce.user_id = auth.uid() 
    AND c.subscription_status = 'active'
  )
);

-- Create policy for employees to view availability slots from specialists
DROP POLICY IF EXISTS "Authenticated users can view available slots" ON public.availability_slots;
CREATE POLICY "Employees from paid companies can view available slots"
ON public.availability_slots
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM company_employees ce
    JOIN companies c ON c.id = ce.company_id
    WHERE ce.user_id = auth.uid() 
    AND c.subscription_status = 'active'
  )
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'specialist'::app_role)
);