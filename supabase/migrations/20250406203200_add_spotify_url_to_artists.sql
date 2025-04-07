-- Add spotify_url column to artists table
ALTER TABLE public.artists
ADD COLUMN IF NOT EXISTS spotify_url TEXT;

-- Optional: Add index if you plan to query by spotify_url frequently
-- CREATE INDEX IF NOT EXISTS idx_artists_spotify_url ON public.artists(spotify_url);