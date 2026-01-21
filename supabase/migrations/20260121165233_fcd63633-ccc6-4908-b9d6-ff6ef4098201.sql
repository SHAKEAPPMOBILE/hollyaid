-- Create table to track when users last read booking messages
CREATE TABLE public.booking_message_reads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  last_read_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(booking_id, user_id)
);

-- Enable RLS
ALTER TABLE public.booking_message_reads ENABLE ROW LEVEL SECURITY;

-- Users can view their own read status
CREATE POLICY "Users can view their own read status"
ON public.booking_message_reads FOR SELECT
USING (user_id = auth.uid());

-- Users can insert their own read status
CREATE POLICY "Users can insert their own read status"
ON public.booking_message_reads FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Users can update their own read status
CREATE POLICY "Users can update their own read status"
ON public.booking_message_reads FOR UPDATE
USING (user_id = auth.uid());

-- Create index for faster lookups
CREATE INDEX idx_booking_message_reads_booking_user ON public.booking_message_reads(booking_id, user_id);
CREATE INDEX idx_booking_message_reads_user ON public.booking_message_reads(user_id);