-- Fix venue relationships and ensure proper field mappings
-- This migration addresses issues with shows not being properly linked to venues and artists

-- First, ensure venue_id in shows table has proper foreign key constraints
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'shows_venue_id_fkey'
  ) THEN
    ALTER TABLE public.shows
    ADD CONSTRAINT shows_venue_id_fkey
    FOREIGN KEY (venue_id)
    REFERENCES public.venues(id)
    ON DELETE SET NULL;
  END IF;
END $$;

-- Create an index on venue_id in shows for faster lookups
CREATE INDEX IF NOT EXISTS idx_shows_venue_id 
ON public.shows(venue_id);

-- Create an index on artist_id in shows for faster lookups
CREATE INDEX IF NOT EXISTS idx_shows_artist_id 
ON public.shows(artist_id);

-- Create index on date for faster queries on upcoming/past shows
CREATE INDEX IF NOT EXISTS idx_shows_date 
ON public.shows(date);

-- Fix any shows without venue_id that might have venue information
UPDATE public.shows
SET venue_id = v.id
FROM public.venues v
WHERE shows.venue_id IS NULL
AND LOWER(shows.name) LIKE '%' || LOWER(v.name) || '%';

-- Make sure we update venue_id in setlists when show_id is present
UPDATE public.setlists s
SET venue_id = shows.venue_id
FROM public.shows
WHERE s.show_id = shows.id
AND s.venue_id IS NULL
AND shows.venue_id IS NOT NULL;

-- Add RLS policies if not already exists
-- This ensures data access is properly controlled
DO $$
BEGIN
  -- Shows RLS policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'shows' AND policyname = 'enable_read_access_for_all'
  ) THEN
    ALTER TABLE public.shows ENABLE ROW LEVEL SECURITY;
    CREATE POLICY enable_read_access_for_all ON public.shows
      FOR SELECT USING (true);
  END IF;

  -- Venues RLS policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'venues' AND policyname = 'enable_read_access_for_all'
  ) THEN
    ALTER TABLE public.venues ENABLE ROW LEVEL SECURITY;
    CREATE POLICY enable_read_access_for_all ON public.venues
      FOR SELECT USING (true);
  END IF;
END $$; 