-- Functions for votes (can be in a transaction)
create or replace function increment_vote(song_id uuid, user_id uuid)
returns void as $$
begin
  insert into votes (song_id, user_id, count)
  values (song_id, user_id, 1)
  on conflict (song_id, user_id)
  do update set count = votes.count + 1;

  update songs
  set vote_count = vote_count + 1
  where id = song_id;
end;
$$ language plpgsql;

create or replace function decrement_vote(song_id uuid, user_id uuid)
returns void as $$
begin
  update votes
  set count = greatest(count - 1, 0)
  where song_id = song_id and user_id = user_id;

  update songs
  set vote_count = greatest(vote_count - 1, 0)
  where id = song_id;
end;
$$ language plpgsql;

-- Functions for transaction support
CREATE OR REPLACE FUNCTION begin_transaction()
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  -- Using EXECUTE to start a transaction
  EXECUTE 'BEGIN';
END;
$$;

CREATE OR REPLACE FUNCTION commit_transaction()
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  -- Using EXECUTE to commit a transaction
  EXECUTE 'COMMIT';
END;
$$;

CREATE OR REPLACE FUNCTION rollback_transaction()
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  -- Using EXECUTE to rollback a transaction
  EXECUTE 'ROLLBACK';
END;
$$;

-- Create cache tables
CREATE TABLE IF NOT EXISTS api_cache (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  endpoint TEXT NOT NULL,
  data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  UNIQUE(endpoint)
);

CREATE TABLE IF NOT EXISTS error_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  endpoint TEXT NOT NULL,
  error TEXT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add Setlist.fm MBID column to artists table
ALTER TABLE public.artists ADD COLUMN IF NOT EXISTS setlist_fm_mbid TEXT;

-- Add last_updated column to related tables if they don't have it
ALTER TABLE public.shows ADD COLUMN IF NOT EXISTS last_updated TIMESTAMP WITH TIME ZONE DEFAULT now();
ALTER TABLE public.songs ADD COLUMN IF NOT EXISTS last_updated TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Create table for storing raw setlist data
CREATE TABLE IF NOT EXISTS public.setlist_raw_data (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  artist_id UUID REFERENCES public.artists(id),
  show_id UUID REFERENCES public.shows(id),
  setlist_id UUID REFERENCES public.setlists(id),
  raw_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(show_id)
);

-- Regular indexes
CREATE INDEX IF NOT EXISTS idx_api_cache_endpoint ON api_cache(endpoint);
CREATE INDEX IF NOT EXISTS idx_api_cache_expires ON api_cache(expires_at DESC);
CREATE INDEX IF NOT EXISTS idx_error_logs_endpoint ON error_logs(endpoint);
CREATE INDEX IF NOT EXISTS idx_error_logs_timestamp ON error_logs(timestamp DESC); 