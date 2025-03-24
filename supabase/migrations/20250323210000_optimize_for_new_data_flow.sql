-- Migration to optimize database for the new data flow
-- This adds additional indexes and a helper function

-- Add indexes for common queries in our new data flow
CREATE INDEX IF NOT EXISTS idx_shows_artist_id ON shows(artist_id);
CREATE INDEX IF NOT EXISTS idx_shows_venue_id ON shows(venue_id);
CREATE INDEX IF NOT EXISTS idx_shows_date ON shows(date DESC);
CREATE INDEX IF NOT EXISTS idx_setlists_show_id ON setlists(show_id);
CREATE INDEX IF NOT EXISTS idx_setlist_songs_setlist_id ON setlist_songs(setlist_id);
CREATE INDEX IF NOT EXISTS idx_songs_artist_id_popularity ON songs(artist_id, popularity DESC);

-- Add a function to get random songs for an artist
-- This helps with generating setlists
CREATE OR REPLACE FUNCTION get_random_artist_songs(artist_uuid UUID, count INTEGER)
RETURNS SETOF songs AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM songs
  WHERE artist_id = artist_uuid
  ORDER BY random()
  LIMIT count;
END;
$$ LANGUAGE plpgsql;

-- Add an error log table to track issues with data imports
CREATE TABLE IF NOT EXISTS error_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  endpoint TEXT,
  error TEXT,
  details JSONB,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Allow all access to error_logs for authenticated users
GRANT ALL ON error_logs TO authenticated;
ALTER TABLE error_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Error logs are viewable by authenticated users"
ON error_logs FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Error logs are insertable by authenticated users"
ON error_logs FOR INSERT
TO authenticated
WITH CHECK (true);

-- Add setlist_raw_data table for debugging purposes
CREATE TABLE IF NOT EXISTS setlist_raw_data (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  artist_id UUID REFERENCES public.artists(id),
  show_id UUID REFERENCES public.shows(id),
  setlist_id UUID REFERENCES public.setlists(id),
  raw_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Allow all access to setlist_raw_data for authenticated users
GRANT ALL ON setlist_raw_data TO authenticated;
ALTER TABLE setlist_raw_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Setlist raw data is viewable by authenticated users"
ON setlist_raw_data FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Setlist raw data is insertable by authenticated users"
ON setlist_raw_data FOR INSERT
TO authenticated
WITH CHECK (true);
