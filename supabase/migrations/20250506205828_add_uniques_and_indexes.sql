-- Add missing unique constraints and foreign keys as specified in the rebuild plan

-- Check and add unique constraint on artists.ticketmaster_id if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'artists_ticketmaster_id_key' 
    AND conrelid = 'public.artists'::regclass
  ) THEN
    ALTER TABLE public.artists ADD CONSTRAINT artists_ticketmaster_id_key UNIQUE (ticketmaster_id);
  END IF;
END
$$;

-- Check and add unique constraint on artists.spotify_id if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'artists_spotify_id_key' 
    AND conrelid = 'public.artists'::regclass
  ) THEN
    ALTER TABLE public.artists ADD CONSTRAINT artists_spotify_id_key UNIQUE (spotify_id);
  END IF;
END
$$;

-- Check and add unique constraint on shows.ticketmaster_id if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'shows_ticketmaster_id_key' 
    AND conrelid = 'public.shows'::regclass
  ) THEN
    ALTER TABLE public.shows ADD CONSTRAINT shows_ticketmaster_id_key UNIQUE (ticketmaster_id);
  END IF;
END
$$;

-- Check and add FK from shows.artist_id to artists.id if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'shows_artist_id_fkey' 
    AND conrelid = 'public.shows'::regclass
  ) THEN
    ALTER TABLE public.shows ADD CONSTRAINT shows_artist_id_fkey FOREIGN KEY (artist_id) REFERENCES public.artists(id);
  END IF;
END
$$;

-- Check and add FK from shows.venue_id to venues.id if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'shows_venue_id_fkey' 
    AND conrelid = 'public.shows'::regclass
  ) THEN
    ALTER TABLE public.shows ADD CONSTRAINT shows_venue_id_fkey FOREIGN KEY (venue_id) REFERENCES public.venues(id);
  END IF;
END
$$;

-- Check and add unique constraint on venues.ticketmaster_id if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'venues_ticketmaster_id_key' 
    AND conrelid = 'public.venues'::regclass
  ) THEN
    ALTER TABLE public.venues ADD CONSTRAINT venues_ticketmaster_id_key UNIQUE (ticketmaster_id);
  END IF;
END
$$;

-- Check and add composite unique constraint on songs (spotify_id, artist_id) if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'songs_spotify_id_artist_id_key' 
    AND conrelid = 'public.songs'::regclass
  ) THEN
    ALTER TABLE public.songs ADD CONSTRAINT songs_spotify_id_artist_id_key UNIQUE (spotify_id, artist_id);
  END IF;
END
$$;

-- Add useful indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_shows_date ON public.shows (date);
CREATE INDEX IF NOT EXISTS idx_shows_artist_id ON public.shows (artist_id);
CREATE INDEX IF NOT EXISTS idx_shows_venue_id ON public.shows (venue_id);
CREATE INDEX IF NOT EXISTS idx_songs_artist_id ON public.songs (artist_id);
