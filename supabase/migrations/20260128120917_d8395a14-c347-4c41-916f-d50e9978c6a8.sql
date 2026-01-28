-- Create a table to track test account data for auto-cleanup
CREATE TABLE public.test_account_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  test_user_id uuid NOT NULL,
  table_name text NOT NULL,
  record_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  expires_at timestamp with time zone NOT NULL DEFAULT (now() + interval '12 hours')
);

-- Enable RLS
ALTER TABLE public.test_account_data ENABLE ROW LEVEL SECURITY;

-- Only admins can manage test data records
CREATE POLICY "Admins can manage test data"
  ON public.test_account_data
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Create a function to check if a user is a test account
CREATE OR REPLACE FUNCTION public.is_test_account(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM profiles p
    WHERE p.user_id = _user_id
      AND p.email IN (
        'test-employee@hollyaid.com',
        'test-company@hollyaid.com',
        'test-specialist@hollyaid.com'
      )
  )
$$;

-- Create a function to clean up expired test data
CREATE OR REPLACE FUNCTION public.cleanup_expired_test_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN 
    SELECT * FROM test_account_data WHERE expires_at < now()
  LOOP
    -- Delete from the appropriate table based on table_name
    EXECUTE format('DELETE FROM public.%I WHERE id = $1', rec.table_name)
    USING rec.record_id;
    
    -- Delete the tracking record
    DELETE FROM test_account_data WHERE id = rec.id;
  END LOOP;
END;
$$;