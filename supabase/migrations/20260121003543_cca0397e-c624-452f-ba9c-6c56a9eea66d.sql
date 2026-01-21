-- Add notification_preference column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN notification_preference text NOT NULL DEFAULT 'both' 
CHECK (notification_preference IN ('email', 'whatsapp', 'both'));