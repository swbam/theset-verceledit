-- Migration for simplified sync system
-- This keeps the existing sync_tasks table but adds a new sync_logs table for better tracking

-- New table for tracking sync runs
CREATE TABLE IF NOT EXISTS public.sync_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('artist', 'venue', 'show', 'setlist', 'song')),
  entity_id UUID NOT NULL,
  external_id TEXT,  -- Ticketmaster ID, Spotify ID, etc.
  external_service TEXT, -- 'ticketmaster', 'spotify', 'setlist_fm'
  status TEXT NOT NULL CHECK (status IN ('started', 'completed', 'failed')),
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER, -- For tracking performance
  error TEXT
);

-- Add indexes for query performance
CREATE INDEX IF NOT EXISTS idx_sync_logs_entity ON public.sync_logs (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_sync_logs_status ON public.sync_logs (status, created_at);
CREATE INDEX IF NOT EXISTS idx_sync_logs_external ON public.sync_logs (external_service, external_id);

-- Add function to update sync_logs on completion
CREATE OR REPLACE FUNCTION public.fn_update_sync_log_complete()
RETURNS TRIGGER AS $$
BEGIN
  -- Update duration_ms based on when the log was created
  NEW.duration_ms := EXTRACT(EPOCH FROM (NOW() - NEW.created_at)) * 1000;
  NEW.completed_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger to auto-update sync_logs duration on completion
DROP TRIGGER IF EXISTS trg_update_sync_log_complete ON public.sync_logs;
CREATE TRIGGER trg_update_sync_log_complete
BEFORE UPDATE ON public.sync_logs
FOR EACH ROW
WHEN (OLD.status = 'started' AND (NEW.status = 'completed' OR NEW.status = 'failed'))
EXECUTE FUNCTION public.fn_update_sync_log_complete();

-- Add convenience view for last sync status by entity
CREATE OR REPLACE VIEW public.entity_sync_status AS
SELECT 
  entity_type,
  entity_id,
  MAX(created_at) AS last_sync_attempt,
  (SELECT status FROM public.sync_logs sl2 
   WHERE sl2.entity_type = sl1.entity_type 
   AND sl2.entity_id = sl1.entity_id
   ORDER BY created_at DESC LIMIT 1) AS last_status,
  (SELECT completed_at FROM public.sync_logs sl3
   WHERE sl3.entity_type = sl1.entity_type 
   AND sl3.entity_id = sl1.entity_id
   AND sl3.status = 'completed'
   ORDER BY completed_at DESC LIMIT 1) AS last_successful_sync
FROM public.sync_logs sl1
GROUP BY entity_type, entity_id;

-- Enable RLS on new tables
ALTER TABLE public.sync_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for sync_logs
CREATE POLICY "Sync logs are viewable by authenticated users"
  ON public.sync_logs
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Sync logs are insertable by service role"
  ON public.sync_logs
  FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Sync logs are updatable by service role"
  ON public.sync_logs
  FOR UPDATE
  TO service_role
  USING (true);

-- Add additional sync columns to relevant entity tables to track sync status

-- Artists table
ALTER TABLE IF EXISTS public.artists 
ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_sync_status TEXT;

-- Venues table
ALTER TABLE IF EXISTS public.venues 
ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_sync_status TEXT;

-- Shows table
ALTER TABLE IF EXISTS public.shows 
ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_sync_status TEXT; 