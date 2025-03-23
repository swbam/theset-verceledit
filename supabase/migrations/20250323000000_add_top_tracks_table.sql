-- Create top_tracks table to store artist's top tracks from Spotify
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