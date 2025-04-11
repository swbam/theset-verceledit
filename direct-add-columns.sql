-- Direct column additions without all the IF NOT EXISTS checks
-- For emergency use to add the necessary columns directly

-- Add ticketmaster_id columns to tables
ALTER TABLE public.artists ADD COLUMN IF NOT EXISTS ticketmaster_id TEXT UNIQUE;
ALTER TABLE public.venues ADD COLUMN IF NOT EXISTS ticketmaster_id TEXT UNIQUE;
ALTER TABLE public.shows ADD COLUMN IF NOT EXISTS ticketmaster_id TEXT UNIQUE;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_artists_ticketmaster_id ON public.artists(ticketmaster_id);
CREATE INDEX IF NOT EXISTS idx_venues_ticketmaster_id ON public.venues(ticketmaster_id);
CREATE INDEX IF NOT EXISTS idx_shows_ticketmaster_id ON public.shows(ticketmaster_id);
CREATE INDEX IF NOT EXISTS idx_artists_spotify_id ON public.artists(spotify_id);
CREATE INDEX IF NOT EXISTS idx_songs_spotify_id ON public.songs(spotify_id);
CREATE INDEX IF NOT EXISTS idx_setlists_setlist_fm_id ON public.setlists(setlist_fm_id);

-- Populate ticketmaster_id from external_id if it exists
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'artists' AND column_name = 'external_id'
  ) THEN
    UPDATE public.artists
    SET ticketmaster_id = external_id
    WHERE ticketmaster_id IS NULL AND external_id IS NOT NULL;
  END IF;
END $$;

DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'venues' AND column_name = 'external_id'
  ) THEN
    UPDATE public.venues
    SET ticketmaster_id = external_id
    WHERE ticketmaster_id IS NULL AND external_id IS NOT NULL;
  END IF;
END $$;

DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'shows' AND column_name = 'external_id'
  ) THEN
    UPDATE public.shows
    SET ticketmaster_id = external_id
    WHERE ticketmaster_id IS NULL AND external_id IS NOT NULL;
  END IF;
END $$; 