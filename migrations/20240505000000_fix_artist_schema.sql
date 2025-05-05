-- Update artists table schema
ALTER TABLE artists
  -- Ensure required columns exist
  ADD COLUMN IF NOT EXISTS ticketmaster_id TEXT,
  ADD COLUMN IF NOT EXISTS spotify_id TEXT,
  ADD COLUMN IF NOT EXISTS image_url TEXT,
  ADD COLUMN IF NOT EXISTS spotify_url TEXT,
  ADD COLUMN IF NOT EXISTS genres TEXT[],
  ADD COLUMN IF NOT EXISTS popularity INTEGER,
  ADD COLUMN IF NOT EXISTS followers INTEGER,
  ADD COLUMN IF NOT EXISTS stored_songs JSONB DEFAULT '[]'::JSONB,
  ADD COLUMN IF NOT EXISTS sync_status JSONB DEFAULT '{"ticketmaster": "pending", "spotify": "pending"}'::JSONB,
  ADD COLUMN IF NOT EXISTS last_sync TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_spotify_sync TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_ticketmaster_sync TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_sync_error TEXT,
  ADD COLUMN IF NOT EXISTS upcoming_shows_count INTEGER DEFAULT 0;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS artists_ticketmaster_id_idx ON artists(ticketmaster_id);
CREATE INDEX IF NOT EXISTS artists_spotify_id_idx ON artists(spotify_id);
CREATE INDEX IF NOT EXISTS artists_last_sync_idx ON artists(last_sync);

-- Add constraints
ALTER TABLE artists
  ALTER COLUMN name SET NOT NULL,
  ADD CONSTRAINT artists_ticketmaster_id_unique UNIQUE (ticketmaster_id),
  ADD CONSTRAINT artists_spotify_id_unique UNIQUE (spotify_id);

-- Add RLS policies
ALTER TABLE artists ENABLE ROW LEVEL SECURITY;

-- Allow public read access
DROP POLICY IF EXISTS "Allow public read access" ON artists;
CREATE POLICY "Allow public read access" ON artists
  FOR SELECT USING (true);

-- Allow service role full access
DROP POLICY IF EXISTS "Allow service role full access" ON artists;
CREATE POLICY "Allow service role full access" ON artists
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Add function to update last_sync timestamp
CREATE OR REPLACE FUNCTION update_artist_last_sync()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_sync = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger to update last_sync on any change
DROP TRIGGER IF EXISTS update_artist_last_sync_trigger ON artists;
CREATE TRIGGER update_artist_last_sync_trigger
  BEFORE UPDATE ON artists
  FOR EACH ROW
  EXECUTE FUNCTION update_artist_last_sync();

-- Add function to validate stored_songs JSONB
CREATE OR REPLACE FUNCTION validate_stored_songs()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.stored_songs IS NOT NULL AND jsonb_typeof(NEW.stored_songs) != 'array' THEN
    RAISE EXCEPTION 'stored_songs must be a JSONB array';
  END IF;
  
  -- Validate each song object has required fields
  IF NEW.stored_songs IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM jsonb_array_elements(NEW.stored_songs) song
      WHERE NOT (
        song ? 'id' AND 
        song ? 'name' AND 
        song ? 'duration_ms' AND 
        song ? 'popularity'
      )
    ) THEN
      RAISE EXCEPTION 'Each song must have id, name, duration_ms, and popularity fields';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger to validate stored_songs before insert/update
DROP TRIGGER IF EXISTS validate_stored_songs_trigger ON artists;
CREATE TRIGGER validate_stored_songs_trigger
  BEFORE INSERT OR UPDATE OF stored_songs ON artists
  FOR EACH ROW
  EXECUTE FUNCTION validate_stored_songs();

-- Add function to validate sync_status JSONB
CREATE OR REPLACE FUNCTION validate_sync_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.sync_status IS NOT NULL AND jsonb_typeof(NEW.sync_status) != 'object' THEN
    RAISE EXCEPTION 'sync_status must be a JSONB object';
  END IF;
  
  -- Validate sync status values
  IF NEW.sync_status IS NOT NULL THEN
    IF EXISTS (
      SELECT 1
      FROM jsonb_each_text(NEW.sync_status) status
      WHERE status.value NOT IN ('pending', 'syncing', 'success', 'error')
    ) THEN
      RAISE EXCEPTION 'sync_status values must be one of: pending, syncing, success, error';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger to validate sync_status before insert/update
DROP TRIGGER IF EXISTS validate_sync_status_trigger ON artists;
CREATE TRIGGER validate_sync_status_trigger
  BEFORE INSERT OR UPDATE OF sync_status ON artists
  FOR EACH ROW
  EXECUTE FUNCTION validate_sync_status();
