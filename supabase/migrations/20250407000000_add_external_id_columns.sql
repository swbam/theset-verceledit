-- Migration: 20250407000000_add_external_id_columns.sql
-- Description: Adds support for ticketmaster_id columns and indexes to various tables for better external ID handling

-- Run this migration within a transaction to ensure atomic changes
BEGIN;

-- Add ticketmaster_id column to artists table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'artists' AND column_name = 'ticketmaster_id'
  ) THEN
    ALTER TABLE public.artists ADD COLUMN ticketmaster_id TEXT UNIQUE;
    RAISE NOTICE 'Added ticketmaster_id column to artists table';
  ELSE
    RAISE NOTICE 'ticketmaster_id column already exists in artists table';
  END IF;
END $$;

-- Add ticketmaster_id column to venues table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'venues' AND column_name = 'ticketmaster_id'
  ) THEN
    ALTER TABLE public.venues ADD COLUMN ticketmaster_id TEXT UNIQUE;
    RAISE NOTICE 'Added ticketmaster_id column to venues table';
  ELSE
    RAISE NOTICE 'ticketmaster_id column already exists in venues table';
  END IF;
END $$;

-- Add ticketmaster_id column to shows table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'shows' AND column_name = 'ticketmaster_id'
  ) THEN
    ALTER TABLE public.shows ADD COLUMN ticketmaster_id TEXT UNIQUE;
    RAISE NOTICE 'Added ticketmaster_id column to shows table';
  ELSE
    RAISE NOTICE 'ticketmaster_id column already exists in shows table';
  END IF;
END $$;

-- Create indexes on ticketmaster_id columns for better query performance
DO $$ 
BEGIN
  -- For artists
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'artists' AND indexname = 'idx_artists_ticketmaster_id'
  ) THEN
    CREATE INDEX idx_artists_ticketmaster_id ON public.artists(ticketmaster_id);
    RAISE NOTICE 'Created index on artists.ticketmaster_id';
  ELSE
    RAISE NOTICE 'Index on artists.ticketmaster_id already exists';
  END IF;

  -- For venues
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'venues' AND indexname = 'idx_venues_ticketmaster_id'
  ) THEN
    CREATE INDEX idx_venues_ticketmaster_id ON public.venues(ticketmaster_id);
    RAISE NOTICE 'Created index on venues.ticketmaster_id';
  ELSE
    RAISE NOTICE 'Index on venues.ticketmaster_id already exists';
  END IF;

  -- For shows
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'shows' AND indexname = 'idx_shows_ticketmaster_id'
  ) THEN
    CREATE INDEX idx_shows_ticketmaster_id ON public.shows(ticketmaster_id);
    RAISE NOTICE 'Created index on shows.ticketmaster_id';
  ELSE
    RAISE NOTICE 'Index on shows.ticketmaster_id already exists';
  END IF;

  -- Ensure we have index on songs.spotify_id if not already exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'songs' AND indexname = 'idx_songs_spotify_id'
  ) THEN
    CREATE INDEX idx_songs_spotify_id ON public.songs(spotify_id);
    RAISE NOTICE 'Created index on songs.spotify_id';
  ELSE
    RAISE NOTICE 'Index on songs.spotify_id already exists';
  END IF;

  -- Ensure we have index on setlists.setlist_fm_id if not already exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'setlists' AND indexname = 'idx_setlists_setlist_fm_id'
  ) THEN
    CREATE INDEX idx_setlists_setlist_fm_id ON public.setlists(setlist_fm_id);
    RAISE NOTICE 'Created index on setlists.setlist_fm_id';
  ELSE
    RAISE NOTICE 'Index on setlists.setlist_fm_id already exists';
  END IF;

  -- Ensure we have an index on artists.spotify_id
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'artists' AND indexname = 'idx_artists_spotify_id'
  ) THEN
    CREATE INDEX idx_artists_spotify_id ON public.artists(spotify_id);
    RAISE NOTICE 'Created index on artists.spotify_id';
  ELSE
    RAISE NOTICE 'Index on artists.spotify_id already exists';
  END IF;
END $$;

-- Populate ticketmaster_id from existing external_id for backwards compatibility where available
DO $$ 
BEGIN
  -- For artists (if external_id exists)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'artists' AND column_name = 'external_id'
  ) THEN
    UPDATE public.artists
    SET ticketmaster_id = external_id
    WHERE ticketmaster_id IS NULL AND external_id IS NOT NULL;
    RAISE NOTICE 'Populated artists.ticketmaster_id from artists.external_id';
  END IF;

  -- For venues (if external_id exists)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'venues' AND column_name = 'external_id'
  ) THEN
    UPDATE public.venues
    SET ticketmaster_id = external_id
    WHERE ticketmaster_id IS NULL AND external_id IS NOT NULL;
    RAISE NOTICE 'Populated venues.ticketmaster_id from venues.external_id';
  END IF;

  -- For shows (if external_id exists)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'shows' AND column_name = 'external_id'
  ) THEN
    UPDATE public.shows
    SET ticketmaster_id = external_id
    WHERE ticketmaster_id IS NULL AND external_id IS NOT NULL;
    RAISE NOTICE 'Populated shows.ticketmaster_id from shows.external_id';
  END IF;
END $$;

COMMIT; 