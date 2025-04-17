-- Add ticketmaster_id columns
ALTER TABLE public.artists ADD COLUMN IF NOT EXISTS ticketmaster_id TEXT UNIQUE;
ALTER TABLE public.shows ADD COLUMN IF NOT EXISTS ticketmaster_id TEXT UNIQUE;
ALTER TABLE public.venues ADD COLUMN IF NOT EXISTS ticketmaster_id TEXT UNIQUE;

-- Create venues table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.venues (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticketmaster_id TEXT UNIQUE,
  name TEXT NOT NULL,
  city TEXT,
  state TEXT,
  country TEXT,
  address TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  url TEXT,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add venue_id foreign key to shows
ALTER TABLE public.shows ADD COLUMN IF NOT EXISTS venue_id UUID REFERENCES public.venues(id);

-- Add missing columns to shows
ALTER TABLE public.shows ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE public.shows ADD COLUMN IF NOT EXISTS popularity INTEGER DEFAULT 0;
ALTER TABLE public.shows ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Add missing columns to artists
ALTER TABLE public.artists ADD COLUMN IF NOT EXISTS url TEXT;
ALTER TABLE public.artists ADD COLUMN IF NOT EXISTS spotify_url TEXT;
ALTER TABLE public.artists ADD COLUMN IF NOT EXISTS setlist_fm_mbid TEXT;
ALTER TABLE public.artists ADD COLUMN IF NOT EXISTS setlist_fm_id TEXT;
ALTER TABLE public.artists ADD COLUMN IF NOT EXISTS tm_id TEXT;
ALTER TABLE public.artists ADD COLUMN IF NOT EXISTS stored_tracks JSONB;
ALTER TABLE public.artists ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Create sync_states table
CREATE TABLE IF NOT EXISTS public.sync_states (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entity_id TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  external_id TEXT,
  last_synced TIMESTAMP WITH TIME ZONE DEFAULT now(),
  sync_version INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(entity_id, entity_type)
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_artists_ticketmaster_id ON public.artists(ticketmaster_id);
CREATE INDEX IF NOT EXISTS idx_shows_ticketmaster_id ON public.shows(ticketmaster_id);
CREATE INDEX IF NOT EXISTS idx_venues_ticketmaster_id ON public.venues(ticketmaster_id);
CREATE INDEX IF NOT EXISTS idx_sync_states_entity ON public.sync_states(entity_id, entity_type);