-- Set default hourly_rate to 60 (standard rate) for specialists table
ALTER TABLE public.specialists ALTER COLUMN hourly_rate SET DEFAULT 60;