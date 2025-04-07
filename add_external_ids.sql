-- Add external_id column to Artists table
ALTER TABLE public.artists 
ADD COLUMN IF NOT EXISTS external_id TEXT,
ADD CONSTRAINT unique_artist_external_id UNIQUE (external_id);

-- Add external_id column to Venues table
ALTER TABLE public.venues 
ADD COLUMN IF NOT EXISTS external_id TEXT,
ADD CONSTRAINT unique_venue_external_id UNIQUE (external_id);

-- Add external_id column to Shows table
ALTER TABLE public.shows 
ADD COLUMN IF NOT EXISTS external_id TEXT,
ADD CONSTRAINT unique_show_external_id UNIQUE (external_id);

-- Add venue_external_id column to Shows table
ALTER TABLE public.shows
ADD COLUMN IF NOT EXISTS venue_external_id TEXT;

-- Add artist_external_id column to Shows table
ALTER TABLE public.shows
ADD COLUMN IF NOT EXISTS artist_external_id TEXT;

-- Add external_id column to Setlists table
ALTER TABLE public.setlists 
ADD COLUMN IF NOT EXISTS external_id TEXT,
ADD CONSTRAINT unique_setlist_external_id UNIQUE (external_id);

-- Add external_id column to Songs table 
ALTER TABLE public.songs
ADD COLUMN IF NOT EXISTS external_id TEXT,
ADD CONSTRAINT unique_song_external_id UNIQUE (external_id);

-- Add external_id column to Setlist Songs table
ALTER TABLE public.setlist_songs
ADD COLUMN IF NOT EXISTS external_id TEXT,
ADD CONSTRAINT unique_setlist_song_external_id UNIQUE (external_id);

-- Add external_id column to sync_states table
ALTER TABLE IF EXISTS public.sync_states
ADD COLUMN IF NOT EXISTS external_id TEXT;

-- Create indexes for external_id columns
CREATE INDEX IF NOT EXISTS idx_artists_external_id ON public.artists(external_id);
CREATE INDEX IF NOT EXISTS idx_venues_external_id ON public.venues(external_id);
CREATE INDEX IF NOT EXISTS idx_shows_external_id ON public.shows(external_id);
CREATE INDEX IF NOT EXISTS idx_setlists_external_id ON public.setlists(external_id);
CREATE INDEX IF NOT EXISTS idx_songs_external_id ON public.songs(external_id);
CREATE INDEX IF NOT EXISTS idx_setlist_songs_external_id ON public.setlist_songs(external_id);
CREATE INDEX IF NOT EXISTS idx_shows_venue_external_id ON public.shows(venue_external_id);
CREATE INDEX IF NOT EXISTS idx_shows_artist_external_id ON public.shows(artist_external_id);

-- Create sync_states table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.sync_states (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entity_id TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  external_id TEXT,
  last_synced TIMESTAMP WITH TIME ZONE DEFAULT now(),
  sync_version INTEGER DEFAULT 1,
  UNIQUE(entity_id, entity_type)
);

-- Add index on sync_states
CREATE INDEX IF NOT EXISTS idx_sync_states_external_id ON public.sync_states(external_id);
CREATE INDEX IF NOT EXISTS idx_sync_states_entity_type ON public.sync_states(entity_type);

-- Create sync_queue table if it doesn't exist (needed by queue.ts)
CREATE TABLE IF NOT EXISTS public.sync_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entity_id TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  external_id TEXT,
  operation TEXT NOT NULL,
  priority TEXT DEFAULT 'medium',
  attempts INTEGER DEFAULT 0,
  payload JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create indexes for sync_queue
CREATE INDEX IF NOT EXISTS idx_sync_queue_priority ON public.sync_queue(priority);
CREATE INDEX IF NOT EXISTS idx_sync_queue_entity ON public.sync_queue(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_sync_queue_external_id ON public.sync_queue(external_id); 