-- Create payout_requests table to track specialist payout requests
CREATE TABLE public.payout_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  specialist_id uuid NOT NULL REFERENCES public.specialists(id) ON DELETE CASCADE,
  amount numeric NOT NULL,
  period_start timestamp with time zone NOT NULL,
  period_end timestamp with time zone NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  processed_at timestamp with time zone,
  processed_by uuid,
  notes text
);

-- Enable RLS
ALTER TABLE public.payout_requests ENABLE ROW LEVEL SECURITY;

-- Specialists can view their own payout requests
CREATE POLICY "Specialists can view their own payout requests"
ON public.payout_requests FOR SELECT
USING (is_specialist_owner(auth.uid(), specialist_id));

-- Specialists can create payout requests
CREATE POLICY "Specialists can create payout requests"
ON public.payout_requests FOR INSERT
WITH CHECK (is_specialist_owner(auth.uid(), specialist_id));

-- Admins can view all payout requests
CREATE POLICY "Admins can view all payout requests"
ON public.payout_requests FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- Admins can update payout requests
CREATE POLICY "Admins can update payout requests"
ON public.payout_requests FOR UPDATE
USING (has_role(auth.uid(), 'admin'));