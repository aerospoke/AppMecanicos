-- Policies to allow mechanics to accept and then update their assigned requests
-- Run this in Supabase SQL Editor.

ALTER TABLE public.service_requests ENABLE ROW LEVEL SECURITY;

-- 1) Mechanics can ACCEPT a request (claim it)
-- Old row must have mechanic_id IS NULL, new row must set mechanic_id = auth.uid and status='accepted'
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'service_requests' AND policyname = 'Mechanics can accept requests'
  ) THEN
    EXECUTE 'DROP POLICY "Mechanics can accept requests" ON public.service_requests';
  END IF;
END $$;

CREATE POLICY "Mechanics can accept requests"
ON public.service_requests FOR UPDATE
USING (
  mechanic_id IS NULL AND
  EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.rol IN ('mecanico','admin')
  )
)
WITH CHECK (
  mechanic_id = auth.uid() AND status = 'accepted'
);

-- 2) Assigned mechanic can update tracking and progress after accepting (keep your existing policy or replace)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'service_requests' AND policyname = 'Assigned mechanic can update tracking'
  ) THEN
    EXECUTE 'DROP POLICY "Assigned mechanic can update tracking" ON public.service_requests';
  END IF;
END $$;

CREATE POLICY "Assigned mechanic can update tracking"
ON public.service_requests FOR UPDATE
USING (auth.uid() = mechanic_id)
WITH CHECK (auth.uid() = mechanic_id);
