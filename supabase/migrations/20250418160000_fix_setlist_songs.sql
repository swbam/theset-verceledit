-- This migration fixes issues with the setlist_songs table

-- Check if setlist_songs table exists, create it if not
CREATE TABLE IF NOT EXISTS public.setlist_songs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  setlist_id UUID REFERENCES public.setlists(id) ON DELETE CASCADE,
  song_id UUID REFERENCES public.songs(id) ON DELETE SET NULL,
  name TEXT,
  position INTEGER,
  order_index INTEGER,
  votes INTEGER DEFAULT 0,
  spotify_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Recreate any missing indexes
CREATE INDEX IF NOT EXISTS idx_setlist_songs_setlist_id ON public.setlist_songs(setlist_id);
CREATE INDEX IF NOT EXISTS idx_setlist_songs_song_id ON public.setlist_songs(song_id);
CREATE INDEX IF NOT EXISTS idx_setlist_songs_spotify_id ON public.setlist_songs(spotify_id) WHERE spotify_id IS NOT NULL;

-- Create get_user_follows function if it doesn't exist
CREATE OR REPLACE FUNCTION public.get_user_follows(p_user_id UUID)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  artist_id UUID,
  created_at TIMESTAMP WITH TIME ZONE,
  artist JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    uf.id,
    uf.user_id,
    uf.artist_id,
    uf.created_at,
    jsonb_build_object(
      'id', a.id,
      'name', a.name,
      'image_url', a.image_url,
      'genres', a.genres
    ) AS artist
  FROM
    public.user_follows uf
    JOIN public.artists a ON uf.artist_id = a.id
  WHERE
    uf.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
