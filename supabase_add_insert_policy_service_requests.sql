-- Allow clients to create their own service requests with RLS enabled
-- Run this in Supabase SQL Editor.

ALTER TABLE public.service_requests ENABLE ROW LEVEL SECURITY;

-- Drop if exists to avoid duplicates when re-running
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'service_requests' AND policyname = 'Clients can create requests'
  ) THEN
    EXECUTE 'DROP POLICY "Clients can create requests" ON public.service_requests';
  END IF;
END $$;

-- INSERT: Only allow rows where user_id == auth.uid()
CREATE POLICY "Clients can create requests"
ON public.service_requests FOR INSERT
WITH CHECK (auth.uid() = user_id);
