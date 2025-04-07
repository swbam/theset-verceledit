-- Add url column to artists table
ALTER TABLE public.artists
ADD COLUMN IF NOT EXISTS url TEXT;

-- Optional: Add index if you plan to query by url frequently
-- CREATE INDEX IF NOT EXISTS idx_artists_url ON public.artists(url);