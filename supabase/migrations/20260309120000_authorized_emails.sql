-- Authorized emails: only these can request a magic-link login
CREATE TABLE public.authorized_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  added_by_user_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_authorized_emails_email_lower ON public.authorized_emails (lower(email));

ALTER TABLE public.authorized_emails ENABLE ROW LEVEL SECURITY;

-- Platform admins (info@hollyaid.com, contact@shakeapp.today) can manage
CREATE POLICY "Platform admins can manage authorized_emails"
ON public.authorized_emails
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM auth.users u
    WHERE u.id = auth.uid()
    AND lower(u.email) IN ('info@hollyaid.com', 'contact@shakeapp.today')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM auth.users u
    WHERE u.id = auth.uid()
    AND lower(u.email) IN ('info@hollyaid.com', 'contact@shakeapp.today')
  )
);

-- RPC for login check: anon can call, returns true/false only
CREATE OR REPLACE FUNCTION public.is_authorized_email(check_email TEXT)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM authorized_emails
    WHERE lower(email) = lower(trim(check_email))
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_authorized_email(TEXT) TO anon;

-- Seed initial authorized emails
INSERT INTO public.authorized_emails (email) VALUES
  ('info@hollyaid.com'),
  ('contact@shakeapp.today')
ON CONFLICT (email) DO NOTHING;
