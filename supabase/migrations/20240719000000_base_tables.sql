-- Create extension for UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create artists table
CREATE TABLE IF NOT EXISTS public.artists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  spotify_id TEXT UNIQUE,
  image_url TEXT,
  followers INTEGER,
  popularity INTEGER,
  genres TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create shows table
CREATE TABLE IF NOT EXISTS public.shows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  artist_id UUID REFERENCES public.artists(id),
  date TIMESTAMP WITH TIME ZONE,
  venue TEXT,
  city TEXT,
  ticket_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create setlists table
CREATE TABLE IF NOT EXISTS public.setlists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  artist_id UUID REFERENCES public.artists(id),
  date TIMESTAMP WITH TIME ZONE,
  venue TEXT,
  venue_city TEXT,
  tour_name TEXT,
  setlist_fm_id TEXT UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create setlist_songs table
CREATE TABLE IF NOT EXISTS public.setlist_songs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  setlist_id UUID REFERENCES public.setlists(id),
  name TEXT NOT NULL,
  position INTEGER,
  artist_id UUID REFERENCES public.artists(id),
  vote_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(setlist_id, position)
);

-- Create votes table
CREATE TABLE IF NOT EXISTS public.votes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  song_id UUID REFERENCES public.setlist_songs(id),
  user_id UUID,
  count INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(song_id, user_id)
);

-- Create tracks table for storing top tracks
CREATE TABLE IF NOT EXISTS public.tracks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  artist_id UUID REFERENCES public.artists(id),
  name TEXT NOT NULL,
  spotify_id TEXT UNIQUE,
  spotify_url TEXT,
  duration_ms INTEGER,
  popularity INTEGER,
  preview_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
); 