-- Create specialist_reviews table
CREATE TABLE public.specialist_reviews (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  specialist_id uuid NOT NULL REFERENCES public.specialists(id) ON DELETE CASCADE,
  employee_user_id uuid NOT NULL,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(booking_id) -- One review per booking
);

-- Enable RLS
ALTER TABLE public.specialist_reviews ENABLE ROW LEVEL SECURITY;

-- Employees can create reviews for their completed bookings
CREATE POLICY "Employees can create reviews for their bookings"
ON public.specialist_reviews
FOR INSERT
WITH CHECK (
  employee_user_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.id = booking_id
      AND b.employee_user_id = auth.uid()
      AND b.status = 'completed'
  )
);

-- Employees can view their own reviews
CREATE POLICY "Employees can view their own reviews"
ON public.specialist_reviews
FOR SELECT
USING (employee_user_id = auth.uid());

-- Specialists can view reviews about them
CREATE POLICY "Specialists can view their reviews"
ON public.specialist_reviews
FOR SELECT
USING (is_specialist_owner(auth.uid(), specialist_id));

-- Anyone from a paid company can view specialist reviews (for browsing)
CREATE POLICY "Paid company members can view reviews"
ON public.specialist_reviews
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM company_employees ce
    JOIN companies c ON c.id = ce.company_id
    WHERE ce.user_id = auth.uid() AND c.subscription_status = 'active'
  ) OR
  EXISTS (
    SELECT 1 FROM companies c
    WHERE c.admin_user_id = auth.uid() AND c.subscription_status = 'active'
  )
);

-- Admins can manage all reviews
CREATE POLICY "Admins can manage reviews"
ON public.specialist_reviews
FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- Create index for faster lookups
CREATE INDEX idx_specialist_reviews_specialist ON public.specialist_reviews(specialist_id);
CREATE INDEX idx_specialist_reviews_booking ON public.specialist_reviews(booking_id);