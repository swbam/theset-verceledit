-- Add external_id column to artists table
ALTER TABLE public.artists
ADD COLUMN IF NOT EXISTS external_id TEXT;

-- Add unique constraint to external_id on artists table
-- Using IF NOT EXISTS for the constraint name to be safe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT constraint_name 
    FROM information_schema.table_constraints 
    WHERE table_schema = 'public' 
    AND table_name = 'artists' 
    AND constraint_name = 'artists_external_id_key'
  ) THEN
    ALTER TABLE public.artists
    ADD CONSTRAINT artists_external_id_key UNIQUE (external_id);
  END IF;
END;
$$;

-- Add external_id column to shows table
ALTER TABLE public.shows
ADD COLUMN IF NOT EXISTS external_id TEXT;

-- Add unique constraint to external_id on shows table
-- Using IF NOT EXISTS for the constraint name to be safe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT constraint_name 
    FROM information_schema.table_constraints 
    WHERE table_schema = 'public' 
    AND table_name = 'shows' 
    AND constraint_name = 'shows_external_id_key'
  ) THEN
    ALTER TABLE public.shows
    ADD CONSTRAINT shows_external_id_key UNIQUE (external_id);
  END IF;
END;
$$;

-- Optional: Add indexes for performance if external_id will be queried frequently
CREATE INDEX IF NOT EXISTS idx_artists_external_id ON public.artists(external_id);
CREATE INDEX IF NOT EXISTS idx_shows_external_id ON public.shows(external_id);