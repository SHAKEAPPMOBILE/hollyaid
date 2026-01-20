-- Add session_type column to bookings
ALTER TABLE public.bookings ADD COLUMN session_type text NOT NULL DEFAULT 'first_session';

-- Add comment for documentation
COMMENT ON COLUMN public.bookings.session_type IS 'Type of session: first_session or follow_up';