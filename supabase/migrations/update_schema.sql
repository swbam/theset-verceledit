
-- Create extension for UUID generation if not exists
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Check if job_logs table exists and create if it doesn't
CREATE TABLE IF NOT EXISTS job_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_type TEXT NOT NULL,
  items_processed INTEGER NOT NULL DEFAULT 0,
  items_created INTEGER NOT NULL DEFAULT 0,
  error_count INTEGER NOT NULL DEFAULT 0,
  errors TEXT[] DEFAULT array[]::TEXT[],
  status TEXT NOT NULL DEFAULT 'success',
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Check if homepage_features table exists and create if it doesn't
CREATE TABLE IF NOT EXISTS homepage_features (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  feature_type TEXT NOT NULL,
  position INTEGER NOT NULL,
  title TEXT,
  description TEXT,
  show_id TEXT REFERENCES shows(id) ON DELETE SET NULL,
  artist_id TEXT REFERENCES artists(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Check and update artists table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'artists' AND column_name = 'spotify_id') THEN
        ALTER TABLE artists ADD COLUMN spotify_id TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'artists' AND column_name = 'ticketmaster_id') THEN
        ALTER TABLE artists ADD COLUMN ticketmaster_id TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'artists' AND column_name = 'last_synced') THEN
        ALTER TABLE artists ADD COLUMN last_synced TIMESTAMP WITH TIME ZONE;
    END IF;
END
$$;

-- Update venue table with additional fields if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'venues' AND column_name = 'capacity') THEN
        ALTER TABLE venues ADD COLUMN capacity INTEGER;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'venues' AND column_name = 'image_url') THEN
        ALTER TABLE venues ADD COLUMN image_url TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'venues' AND column_name = 'ticket_url') THEN
        ALTER TABLE venues ADD COLUMN ticket_url TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'venues' AND column_name = 'website') THEN
        ALTER TABLE venues ADD COLUMN website TEXT;
    END IF;
END
$$;

-- Fix venue location to use numeric values for latitude/longitude
DO $$
BEGIN
    -- Update existing values first
    UPDATE venues 
    SET location = jsonb_set(
        jsonb_set(
            COALESCE(location, '{}'::jsonb),
            '{latitude}',
            (CASE 
                WHEN location->>'latitude' ~ '^[0-9]+(\.[0-9]+)?$' THEN 
                    to_jsonb((location->>'latitude')::numeric)
                ELSE 
                    to_jsonb(0::numeric)
            END)
        ),
        '{longitude}',
        (CASE 
            WHEN location->>'longitude' ~ '^[0-9]+(\.[0-9]+)?$' THEN 
                to_jsonb((location->>'longitude')::numeric)
            ELSE 
                to_jsonb(0::numeric)
        END)
    )
    WHERE location IS NOT NULL;
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
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_job_logs_job_type') THEN
        CREATE INDEX idx_job_logs_job_type ON job_logs(job_type);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_homepage_features_feature_type') THEN
        CREATE INDEX idx_homepage_features_feature_type ON homepage_features(feature_type);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_homepage_features_position') THEN
        CREATE INDEX idx_homepage_features_position ON homepage_features(position);
    END IF;
END
$$;

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

-- Fix votes table constraints if needed
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'votes_user_id_setlist_song_id_key' AND table_name = 'votes'
    ) THEN
        -- Check if the table has the columns first
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'votes' AND column_name = 'user_id'
        ) AND EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'votes' AND column_name = 'setlist_song_id'
        ) THEN
            ALTER TABLE votes ADD CONSTRAINT votes_user_id_setlist_song_id_key UNIQUE (user_id, setlist_song_id);
        END IF;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'votes_session_id_setlist_song_id_key' AND table_name = 'votes'
    ) THEN
        -- Check if the table has the columns first
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'votes' AND column_name = 'session_id'
        ) AND EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'votes' AND column_name = 'setlist_song_id'
        ) THEN
            ALTER TABLE votes ADD CONSTRAINT votes_session_id_setlist_song_id_key UNIQUE (session_id, setlist_song_id);
        END IF;
    END IF;
END
$$;
