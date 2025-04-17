-- Update setlists table
ALTER TABLE public.setlists
  -- Add new columns
  ADD COLUMN IF NOT EXISTS show_id UUID REFERENCES public.shows(id),
  ADD COLUMN IF NOT EXISTS setlist_id TEXT UNIQUE;

-- Create played_setlist_songs table for the many-to-many relationship
CREATE TABLE IF NOT EXISTS public.played_setlist_songs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  setlist_id UUID REFERENCES public.setlists(id),
  song_id UUID REFERENCES public.tracks(id),
  position INTEGER,
  is_encore BOOLEAN DEFAULT false,
  info TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(setlist_id, position)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_setlists_artist_id ON public.setlists(artist_id);
CREATE INDEX IF NOT EXISTS idx_setlists_show_id ON public.setlists(show_id);
CREATE INDEX IF NOT EXISTS idx_played_setlist_songs_setlist_id ON public.played_setlist_songs(setlist_id);
CREATE INDEX IF NOT EXISTS idx_played_setlist_songs_song_id ON public.played_setlist_songs(song_id);

-- Add RLS policies
ALTER TABLE public.played_setlist_songs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all users" ON public.played_setlist_songs
  FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users only" ON public.played_setlist_songs
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update for authenticated users only" ON public.played_setlist_songs
  FOR UPDATE USING (auth.role() = 'authenticated');