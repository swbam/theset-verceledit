-- Add Setlist.fm MBID column to artists table
ALTER TABLE public.artists ADD COLUMN IF NOT EXISTS setlist_fm_mbid TEXT;

-- Add last_updated column to related tables if they don't have it
ALTER TABLE public.shows ADD COLUMN IF NOT EXISTS last_updated TIMESTAMP WITH TIME ZONE DEFAULT now();
ALTER TABLE public.setlist_songs ADD COLUMN IF NOT EXISTS last_updated TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Create table for storing raw setlist data (useful for debugging)
CREATE TABLE IF NOT EXISTS public.setlist_raw_data (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  artist_id UUID REFERENCES public.artists(id),
  show_id UUID REFERENCES public.shows(id),
  setlist_id UUID REFERENCES public.setlists(id),
  raw_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(show_id)
); 