-- Fix for the sync_logs table migration

-- First, let's drop the problematic index if it exists
DROP INDEX IF EXISTS public.idx_sync_logs_external;

-- Check if the columns are missing and add them if they are
DO $$
BEGIN
    -- Check if external_service column exists
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'sync_logs' 
        AND column_name = 'external_service'
    ) THEN
        -- Add the missing column
        ALTER TABLE public.sync_logs ADD COLUMN external_service TEXT;
    END IF;

    -- Check if external_id column exists
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'sync_logs' 
        AND column_name = 'external_id'
    ) THEN
        -- Add the missing column
        ALTER TABLE public.sync_logs ADD COLUMN external_id TEXT;
    END IF;
END
$$;

-- Now recreate the index after ensuring the columns exist
CREATE INDEX IF NOT EXISTS idx_sync_logs_external ON public.sync_logs (external_service, external_id);

-- Let's also ensure the sync_logs table exists with all required columns
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
