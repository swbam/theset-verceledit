-- Removed invalid FK to artist_metadata (table does not exist)
-- Add index for spotify_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_artists_spotify_id ON artists(spotify_id);

-- Add index for setlist_fm_id for completeness
CREATE INDEX IF NOT EXISTS idx_artists_setlist_fm_id ON artists(setlist_fm_id);
