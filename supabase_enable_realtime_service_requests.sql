-- Enable Realtime and tracking fields for service_requests
-- Run this in Supabase SQL Editor (Project → SQL).

-- 1) Ensure tracking columns exist
ALTER TABLE public.service_requests
  ADD COLUMN IF NOT EXISTS mechanic_latitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS mechanic_longitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS mechanic_last_update TIMESTAMPTZ;

-- 2) Enable RLS (if not already)
ALTER TABLE public.service_requests ENABLE ROW LEVEL SECURITY;

-- 3) Allow Realtime publication to stream this table
-- Note: Supabase uses the publication "supabase_realtime"
ALTER PUBLICATION supabase_realtime ADD TABLE public.service_requests;

-- 4) RLS policies for reading (Realtime uses SELECT policies)
-- Drop existing duplicates safely if you re-run
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'service_requests' AND policyname = 'Clients can read own service (Realtime)'
  ) THEN
    EXECUTE 'DROP POLICY "Clients can read own service (Realtime)" ON public.service_requests';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'service_requests' AND policyname = 'Mechanics can read all (Realtime)'
  ) THEN
    EXECUTE 'DROP POLICY "Mechanics can read all (Realtime)" ON public.service_requests';
  END IF;
END $$;

-- Client can receive realtime updates for own request
CREATE POLICY "Clients can read own service (Realtime)"
ON public.service_requests FOR SELECT
USING (auth.uid() = user_id);

-- Mechanic (or admin) can receive realtime updates
CREATE POLICY "Mechanics can read all (Realtime)"
ON public.service_requests FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.rol IN ('mecanico','admin')
  )
);

-- 5) Optional: policies to allow mechanics to update tracking fields
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

-- 6) Helpful indexes
CREATE INDEX IF NOT EXISTS idx_service_requests_status ON public.service_requests(status);
CREATE INDEX IF NOT EXISTS idx_service_requests_mechanic ON public.service_requests(mechanic_id);
