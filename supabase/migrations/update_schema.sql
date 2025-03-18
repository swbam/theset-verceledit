-- Create extension for UUID generation if not exists
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Check and update artists table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'artists' AND column_name = 'spotify_id') THEN
        ALTER TABLE artists ADD COLUMN spotify_id TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'artists' AND column_name = 'ticketmaster_id') THEN
        ALTER TABLE artists ADD COLUMN ticketmaster_id TEXT;
    END IF;
END
$$;

-- Update artist_songs table with any missing columns
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'artist_songs' AND column_name = 'track_number') THEN
        ALTER TABLE artist_songs ADD COLUMN track_number INTEGER;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'artist_songs' AND column_name = 'explicit') THEN
        ALTER TABLE artist_songs ADD COLUMN explicit BOOLEAN DEFAULT FALSE;
    END IF;
END
$$;

-- Check and add indexes if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_artists_spotify_id') THEN
        CREATE INDEX idx_artists_spotify_id ON artists(spotify_id) WHERE spotify_id IS NOT NULL;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_artists_ticketmaster_id') THEN
        CREATE INDEX idx_artists_ticketmaster_id ON artists(ticketmaster_id) WHERE ticketmaster_id IS NOT NULL;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_artist_songs_is_top_track') THEN
        CREATE INDEX idx_artist_songs_is_top_track ON artist_songs(is_top_track) WHERE is_top_track IS NOT NULL;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_shows_date') THEN
        CREATE INDEX idx_shows_date ON shows(date) WHERE date IS NOT NULL;
    END IF;
END
$$;

-- Add venues table if it doesn't exist
CREATE TABLE IF NOT EXISTS venues (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  city TEXT,
  state TEXT,
  country TEXT,
  address TEXT,
  postal_code TEXT,
  location JSONB,
  capacity INTEGER,
  image_url TEXT,
  ticket_url TEXT,
  website TEXT,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add foreign key for venue_id in shows table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'shows' AND column_name = 'venue_id'
    ) THEN
        ALTER TABLE shows ADD COLUMN venue_id TEXT REFERENCES venues(id) ON DELETE SET NULL;
    END IF;
END
$$;

-- Check for votes table and create if it doesn't exist
CREATE TABLE IF NOT EXISTS votes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  setlist_item_id UUID NOT NULL,
  show_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  session_id TEXT
);

-- Add constraints if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'votes_user_id_setlist_song_id_key'
    ) THEN
        ALTER TABLE votes ADD CONSTRAINT votes_user_id_setlist_song_id_key UNIQUE (user_id, setlist_song_id);
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'votes_session_id_setlist_song_id_key'
    ) THEN
        ALTER TABLE votes ADD CONSTRAINT votes_session_id_setlist_song_id_key UNIQUE (session_id, setlist_song_id);
    END IF;
END
$$;

-- Add missing indexes
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_votes_user_id') THEN
        CREATE INDEX idx_votes_user_id ON votes(user_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_votes_setlist_song_id') THEN
        CREATE INDEX idx_votes_setlist_song_id ON votes(setlist_song_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_votes_show_id') THEN
        CREATE INDEX idx_votes_show_id ON votes(show_id);
    END IF;
END
$$; 