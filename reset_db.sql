-- Drop all existing tables in the correct order (to avoid foreign key constraint issues)
DROP TABLE IF EXISTS votes CASCADE;
DROP TABLE IF EXISTS setlist_songs CASCADE;
DROP TABLE IF EXISTS setlists CASCADE;
DROP TABLE IF EXISTS past_setlists CASCADE;
DROP TABLE IF EXISTS top_tracks CASCADE;
DROP TABLE IF EXISTS artist_songs CASCADE;
DROP TABLE IF EXISTS shows CASCADE;
DROP TABLE IF EXISTS venues CASCADE;
DROP TABLE IF EXISTS artists CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- Create extension for UUID generation if not exists
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username TEXT,
  full_name TEXT,
  avatar_url TEXT,
  provider TEXT,
  provider_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create artists table
CREATE TABLE IF NOT EXISTS artists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  image_url TEXT,
  genres TEXT[],
  followers INTEGER,
  popularity INTEGER,
  spotify_id TEXT,
  ticketmaster_id TEXT,
  spotify_url TEXT,
  stored_tracks JSONB,
  tracks_last_updated TIMESTAMP WITH TIME ZONE,
  upcoming_shows INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create artist_songs table
CREATE TABLE IF NOT EXISTS artist_songs (
  id TEXT PRIMARY KEY,
  artist_id UUID NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
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

-- Create top_tracks table
CREATE TABLE IF NOT EXISTS top_tracks (
  id TEXT PRIMARY KEY,
  artist_id UUID NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  album_name TEXT,
  album_image_url TEXT,
  spotify_url TEXT,
  preview_url TEXT,
  duration_ms INTEGER,
  popularity INTEGER,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create venues table
CREATE TABLE IF NOT EXISTS venues (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  city TEXT,
  state TEXT,
  country TEXT,
  address TEXT,
  postal_code TEXT,
  location JSONB,
  capacity INTEGER,
  image_url TEXT,
  ticket_url TEXT,
  website TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create shows table
CREATE TABLE IF NOT EXISTS shows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  artist_id UUID REFERENCES artists(id) ON DELETE SET NULL,
  date TIMESTAMP WITH TIME ZONE,
  image_url TEXT,
  ticket_url TEXT,
  venue_id UUID REFERENCES venues(id) ON DELETE SET NULL,
  genre_ids TEXT[],
  popularity INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create setlists table
CREATE TABLE IF NOT EXISTS setlists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  show_id UUID NOT NULL REFERENCES shows(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create setlist_songs table
CREATE TABLE IF NOT EXISTS setlist_songs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  setlist_id UUID NOT NULL REFERENCES setlists(id) ON DELETE CASCADE,
  track_id TEXT NOT NULL REFERENCES top_tracks(id) ON DELETE CASCADE,
  votes INTEGER DEFAULT 0,
  suggested_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create votes table
CREATE TABLE IF NOT EXISTS votes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  setlist_song_id UUID NOT NULL REFERENCES setlist_songs(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create past_setlists table
CREATE TABLE IF NOT EXISTS past_setlists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  artist_id UUID NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
  show_id UUID REFERENCES shows(id) ON DELETE SET NULL,
  setlist_id TEXT NOT NULL,
  event_date TIMESTAMP WITH TIME ZONE NOT NULL,
  setlist_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_artists_spotify_id ON artists(spotify_id) WHERE spotify_id IS NOT NULL;
CREATE INDEX idx_artists_ticketmaster_id ON artists(ticketmaster_id) WHERE ticketmaster_id IS NOT NULL;
CREATE INDEX idx_artist_songs_artist_id ON artist_songs(artist_id);
CREATE INDEX idx_artist_songs_is_top_track ON artist_songs(is_top_track) WHERE is_top_track IS NOT NULL;
CREATE INDEX idx_top_tracks_artist_id ON top_tracks(artist_id);
CREATE INDEX idx_shows_artist_id ON shows(artist_id);
CREATE INDEX idx_shows_date ON shows(date) WHERE date IS NOT NULL;
CREATE INDEX idx_setlists_show_id ON setlists(show_id);
CREATE INDEX idx_setlist_songs_setlist_id ON setlist_songs(setlist_id);
CREATE INDEX idx_setlist_songs_votes ON setlist_songs(votes DESC);
CREATE INDEX idx_votes_user_id ON votes(user_id);
CREATE INDEX idx_votes_setlist_song_id ON votes(setlist_song_id);
CREATE INDEX idx_past_setlists_artist_id ON past_setlists(artist_id);
CREATE INDEX idx_past_setlists_show_id ON past_setlists(show_id); 