-- Migration: 20250408000000_remove_external_id_columns.sql
-- Description: Removes external_id columns as we now use ticketmaster_id exclusively

BEGIN;

-- Remove external_id column from artists table if it exists
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'artists' AND column_name = 'external_id'
  ) THEN
    ALTER TABLE public.artists DROP COLUMN external_id;
    RAISE NOTICE 'Removed external_id column from artists table';
  END IF;
END $$;

-- Remove external_id column from venues table if it exists
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'venues' AND column_name = 'external_id'
  ) THEN
    -- Drop the unique constraint and index first
    ALTER TABLE public.venues DROP CONSTRAINT IF EXISTS venues_external_id_unique;
    DROP INDEX IF EXISTS idx_venues_external_id;
    ALTER TABLE public.venues DROP COLUMN external_id;
    RAISE NOTICE 'Removed external_id column from venues table';
  END IF;
END $$;

-- Remove external_id column from shows table if it exists
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'shows' AND column_name = 'external_id'
  ) THEN
    ALTER TABLE public.shows DROP COLUMN external_id;
    RAISE NOTICE 'Removed external_id column from shows table';
  END IF;
END $$;

COMMIT;