-- Add stored_tracks column to artists table
BEGIN;

-- Add column for storing tracks as JSON
ALTER TABLE public.artists ADD COLUMN IF NOT EXISTS stored_tracks JSONB;

COMMIT; 