-- Add session_duration column to bookings (in minutes)
ALTER TABLE public.bookings ADD COLUMN session_duration integer NOT NULL DEFAULT 60;

-- Add comment for clarity
COMMENT ON COLUMN public.bookings.session_duration IS 'Session duration in minutes (30 or 60)';