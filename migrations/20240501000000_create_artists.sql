-- Create artists table (ensures table exists before policies/indexes)
CREATE TABLE IF NOT EXISTS public.artists (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  image_url text,
  followers integer,
  popularity integer,
  genres text[],
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  url text,
  stored_tracks jsonb,
  spotify_id text,
  setlist_fm_id text,
  ticketmaster_id text,
  setlist_fm_mbid text,
  spotify_url text,
  spotify_popularity integer,
  last_spotify_sync timestamptz,
  last_ticketmaster_sync timestamptz,
  last_sync timestamptz
);
