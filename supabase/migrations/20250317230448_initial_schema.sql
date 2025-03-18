-- Create extension for UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create artists table if not exists (with existing columns)
CREATE TABLE IF NOT EXISTS artists (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  image_url TEXT,
  genres TEXT[],
  followers INTEGER,
  popularity INTEGER,
  spotify_url TEXT,
  stored_tracks JSONB,
  tracks_last_updated TIMESTAMP WITH TIME ZONE,
  upcoming_shows INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create top_tracks table if not exists
CREATE TABLE IF NOT EXISTS top_tracks (
  id TEXT PRIMARY KEY,
  artist_id TEXT NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  album_name TEXT,
  album_image_url TEXT,
  spotify_url TEXT,
  preview_url TEXT,
  duration_ms INTEGER,
  popularity INTEGER,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create artist_songs table if not exists
CREATE TABLE IF NOT EXISTS artist_songs (
  id TEXT PRIMARY KEY,
  artist_id TEXT NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  album_id TEXT,
  album_name TEXT,
  album_image_url TEXT,
  release_date TEXT,
  spotify_url TEXT,
  preview_url TEXT,
  duration_ms INTEGER,
  popularity INTEGER,
  explicit BOOLEAN DEFAULT FALSE,
  track_number INTEGER,
  is_top_track BOOLEAN DEFAULT FALSE,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(id, artist_id)
);

-- Create venues table if not exists
CREATE TABLE IF NOT EXISTS venues (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  city TEXT,
  state TEXT,
  country TEXT,
  address TEXT,
  postal_code TEXT,
  location JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create shows table if not exists
CREATE TABLE IF NOT EXISTS shows (
  id TEXT PRIMARY KEY, 
  name TEXT NOT NULL,
  artist_id TEXT REFERENCES artists(id) ON DELETE SET NULL,
  date TIMESTAMP WITH TIME ZONE,
  image_url TEXT,
  ticket_url TEXT,
  venue_id TEXT REFERENCES venues(id) ON DELETE SET NULL,
  genre_ids TEXT[],
  popularity INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create setlists table if not exists
CREATE TABLE IF NOT EXISTS setlists (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4(),
  show_id TEXT NOT NULL REFERENCES shows(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create setlist_songs table if not exists
CREATE TABLE IF NOT EXISTS setlist_songs (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4(),
  setlist_id TEXT NOT NULL REFERENCES setlists(id) ON DELETE CASCADE,
  track_id TEXT NOT NULL REFERENCES top_tracks(id) ON DELETE CASCADE,
  votes INTEGER DEFAULT 0,
  suggested_by TEXT REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create profiles table if not exists
CREATE TABLE IF NOT EXISTS profiles (
  id TEXT PRIMARY KEY,
  username TEXT,
  full_name TEXT,
  avatar_url TEXT,
  provider TEXT,
  provider_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create votes table if not exists
CREATE TABLE IF NOT EXISTS votes (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  setlist_song_id TEXT NOT NULL REFERENCES setlist_songs(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create past_setlists table if not exists
CREATE TABLE IF NOT EXISTS past_setlists (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4(),
  artist_id TEXT NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
  show_id TEXT REFERENCES shows(id) ON DELETE SET NULL,
  setlist_id TEXT NOT NULL,
  event_date TIMESTAMP WITH TIME ZONE NOT NULL,
  setlist_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indices for performance
CREATE INDEX IF NOT EXISTS idx_artists_spotify_id ON artists((spotify_url));
CREATE INDEX IF NOT EXISTS idx_artist_songs_artist_id ON artist_songs(artist_id);
CREATE INDEX IF NOT EXISTS idx_artist_songs_is_top_track ON artist_songs(is_top_track);
CREATE INDEX IF NOT EXISTS idx_top_tracks_artist_id ON top_tracks(artist_id);
CREATE INDEX IF NOT EXISTS idx_shows_artist_id ON shows(artist_id);
CREATE INDEX IF NOT EXISTS idx_shows_date ON shows(date);
CREATE INDEX IF NOT EXISTS idx_setlists_show_id ON setlists(show_id);
CREATE INDEX IF NOT EXISTS idx_setlist_songs_setlist_id ON setlist_songs(setlist_id);
CREATE INDEX IF NOT EXISTS idx_setlist_songs_votes ON setlist_songs(votes DESC);
CREATE INDEX IF NOT EXISTS idx_votes_user_id ON votes(user_id);
CREATE INDEX IF NOT EXISTS idx_votes_setlist_song_id ON votes(setlist_song_id);
CREATE INDEX IF NOT EXISTS idx_past_setlists_artist_id ON past_setlists(artist_id);
CREATE INDEX IF NOT EXISTS idx_past_setlists_show_id ON past_setlists(show_id); 