-- Combined migrations for TheSet application

-- 1. Fix vote functions with proper parameter naming
CREATE OR REPLACE FUNCTION increment_vote(p_song_id uuid, p_user_id uuid) RETURNS void AS $$
BEGIN
  INSERT INTO votes (song_id, user_id, count)
  VALUES (p_song_id, p_user_id, 1)
  ON CONFLICT (song_id, user_id) DO UPDATE
  SET count = votes.count + 1;
  
  UPDATE setlist_songs
  SET vote_count = vote_count + 1
  WHERE id = p_song_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION decrement_vote(p_song_id uuid, p_user_id uuid) RETURNS void AS $$
BEGIN
  UPDATE votes
  SET count = greatest(count - 1, 0)
  WHERE song_id = p_song_id AND user_id = p_user_id;
  
  UPDATE setlist_songs
  SET vote_count = greatest(vote_count - 1, 0)
  WHERE id = p_song_id;
END;
$$ LANGUAGE plpgsql;

-- 2. Create top_tracks table to store artist's top tracks from Spotify
CREATE TABLE IF NOT EXISTS public.top_tracks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  artist_id UUID REFERENCES public.artists(id) NOT NULL,
  name TEXT NOT NULL,
  album TEXT,
  album_id TEXT,
  spotify_id TEXT UNIQUE,
  duration_ms INTEGER,
  popularity INTEGER DEFAULT 0,
  preview_url TEXT,
  spotify_url TEXT,
  album_image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_top_tracks_artist_id ON top_tracks(artist_id);
CREATE INDEX IF NOT EXISTS idx_top_tracks_spotify_id ON top_tracks(spotify_id);
CREATE INDEX IF NOT EXISTS idx_top_tracks_popularity ON top_tracks(popularity DESC);

-- Create trigger for updated_at
DO $$ 
BEGIN
  CREATE TRIGGER update_top_tracks_updated_at
    BEFORE UPDATE ON top_tracks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 3. Update setlist_songs table to align with our schema
-- First, check if the column exists before trying to add it
DO $$
BEGIN
    -- Add song_id column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'setlist_songs' AND column_name = 'song_id'
    ) THEN
        ALTER TABLE public.setlist_songs ADD COLUMN song_id UUID REFERENCES public.songs(id);
    END IF;

    -- Add name column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'setlist_songs' AND column_name = 'name'
    ) THEN
        ALTER TABLE public.setlist_songs ADD COLUMN name TEXT;
    END IF;

    -- Add track_id column if it doesn't exist (for compatibility)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'setlist_songs' AND column_name = 'track_id'
    ) THEN
        ALTER TABLE public.setlist_songs ADD COLUMN track_id UUID;
    END IF;

    -- Add vote_count column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'setlist_songs' AND column_name = 'vote_count'
    ) THEN
        ALTER TABLE public.setlist_songs ADD COLUMN vote_count INTEGER DEFAULT 0;
    END IF;

    -- Add position column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'setlist_songs' AND column_name = 'position'
    ) THEN
        ALTER TABLE public.setlist_songs ADD COLUMN position INTEGER;
    END IF;

    -- Add artist_id column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'setlist_songs' AND column_name = 'artist_id'
    ) THEN
        ALTER TABLE public.setlist_songs ADD COLUMN artist_id UUID REFERENCES public.artists(id);
    END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_setlist_songs_song_id ON setlist_songs(song_id);
CREATE INDEX IF NOT EXISTS idx_setlist_songs_artist_id ON setlist_songs(artist_id);
CREATE INDEX IF NOT EXISTS idx_setlist_songs_vote_count ON setlist_songs(vote_count DESC);
