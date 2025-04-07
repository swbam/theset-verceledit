-- Add external_id column to venues table to store Ticketmaster ID
ALTER TABLE public.venues
ADD COLUMN external_id TEXT;

-- Add a unique constraint to prevent duplicate external IDs
ALTER TABLE public.venues
ADD CONSTRAINT venues_external_id_unique UNIQUE (external_id);

-- Optional: Add an index for faster lookups if needed
CREATE INDEX IF NOT EXISTS idx_venues_external_id ON public.venues(external_id);