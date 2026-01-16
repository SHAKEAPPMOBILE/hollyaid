-- Add messaging table for booking conversations
CREATE TABLE public.booking_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  sender_user_id UUID NOT NULL,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('employee', 'specialist')),
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add has_set_availability flag to specialists
ALTER TABLE public.specialists ADD COLUMN has_set_availability BOOLEAN DEFAULT false;

-- Add proposed datetime and meeting link to bookings
ALTER TABLE public.bookings ADD COLUMN proposed_datetime TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.bookings ADD COLUMN meeting_link TEXT;
ALTER TABLE public.bookings ADD COLUMN confirmed_datetime TIMESTAMP WITH TIME ZONE;

-- Make slot_id optional since new flow doesn't require pre-set slots
ALTER TABLE public.bookings ALTER COLUMN slot_id DROP NOT NULL;

-- Enable RLS on booking_messages
ALTER TABLE public.booking_messages ENABLE ROW LEVEL SECURITY;

-- Employees can view messages for their bookings
CREATE POLICY "Employees can view their booking messages"
ON public.booking_messages
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.bookings
    WHERE bookings.id = booking_messages.booking_id
    AND bookings.employee_user_id = auth.uid()
  )
);

-- Employees can send messages for their bookings (limit checked in app)
CREATE POLICY "Employees can send messages"
ON public.booking_messages
FOR INSERT
WITH CHECK (
  sender_user_id = auth.uid() AND
  sender_type = 'employee' AND
  EXISTS (
    SELECT 1 FROM public.bookings
    WHERE bookings.id = booking_messages.booking_id
    AND bookings.employee_user_id = auth.uid()
  )
);

-- Specialists can view messages for their bookings
CREATE POLICY "Specialists can view their booking messages"
ON public.booking_messages
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.bookings b
    JOIN public.specialists s ON s.id = b.specialist_id
    WHERE b.id = booking_messages.booking_id
    AND s.user_id = auth.uid()
  )
);

-- Specialists can send messages for their bookings
CREATE POLICY "Specialists can send messages"
ON public.booking_messages
FOR INSERT
WITH CHECK (
  sender_user_id = auth.uid() AND
  sender_type = 'specialist' AND
  EXISTS (
    SELECT 1 FROM public.bookings b
    JOIN public.specialists s ON s.id = b.specialist_id
    WHERE b.id = booking_messages.booking_id
    AND s.user_id = auth.uid()
  )
);