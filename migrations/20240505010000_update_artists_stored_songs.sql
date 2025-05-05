-- Add stored_songs JSONB column if it doesn't exist
ALTER TABLE public.artists ADD COLUMN IF NOT EXISTS stored_songs JSONB;

-- Create GIN index for faster JSONB queries
CREATE INDEX IF NOT EXISTS idx_artists_stored_songs ON public.artists USING GIN (stored_songs);

-- Add function to validate stored_songs JSONB structure
CREATE OR REPLACE FUNCTION validate_stored_songs()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.stored_songs IS NOT NULL THEN
    -- Validate each song has required fields
    IF NOT (SELECT bool_and(song ? 'id' AND song ? 'name')
            FROM jsonb_array_elements(NEW.stored_songs) song) THEN
      RAISE EXCEPTION 'Each song must have id and name fields';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger for stored_songs validation
DROP TRIGGER IF EXISTS validate_stored_songs_trigger ON public.artists;
CREATE TRIGGER validate_stored_songs_trigger
  BEFORE INSERT OR UPDATE OF stored_songs ON public.artists
  FOR EACH ROW
  EXECUTE FUNCTION validate_stored_songs();

-- Add function to get random songs for a show
CREATE OR REPLACE FUNCTION get_random_songs(artist_id TEXT, count INTEGER DEFAULT 5)
RETURNS JSONB AS $$
DECLARE
  songs JSONB;
BEGIN
  SELECT stored_songs INTO songs
  FROM public.artists
  WHERE id = artist_id;

  IF songs IS NULL OR jsonb_array_length(songs) = 0 THEN
    RETURN '[]'::jsonb;
  END IF;

  RETURN (
    SELECT jsonb_agg(song)
    FROM (
      SELECT song
      FROM jsonb_array_elements(songs) song
      ORDER BY random()
      LIMIT count
    ) s
  );
END;
$$ LANGUAGE plpgsql;
