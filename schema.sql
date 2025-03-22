-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create artists table
CREATE TABLE IF NOT EXISTS public.artists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  spotify_id TEXT,
  image_url TEXT,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create shows table
CREATE TABLE IF NOT EXISTS public.shows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  artist_id UUID REFERENCES public.artists(id),
  date TIMESTAMP WITH TIME ZONE NOT NULL,
  venue TEXT,
  city TEXT,
  ticketmaster_id TEXT,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create setlists table
CREATE TABLE IF NOT EXISTS public.setlists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  show_id UUID REFERENCES public.shows(id),
  artist_id UUID REFERENCES public.artists(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create songs table
CREATE TABLE IF NOT EXISTS public.songs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  artist_id UUID REFERENCES public.artists(id),
  setlist_id UUID REFERENCES public.setlists(id),
  vote_count INTEGER DEFAULT 0,
  spotify_id TEXT,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create votes table
CREATE TABLE IF NOT EXISTS public.votes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  song_id UUID REFERENCES public.songs(id),
  user_id UUID NOT NULL,
  count INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(song_id, user_id)
);

-- Create concerts table (if needed)
CREATE TABLE IF NOT EXISTS public.concerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  artist_id UUID REFERENCES public.artists(id),
  date TIMESTAMP WITH TIME ZONE NOT NULL,
  venue TEXT,
  city TEXT,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT now()
); 