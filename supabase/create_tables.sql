-- Create all tables needed for TheSet application
-- This file can be executed against a fresh Supabase database to set up all required tables

-- Create extension for UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create profiles table (for user data)
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

-- Create artists table (from Spotify/Ticketmaster)
CREATE TABLE IF NOT EXISTS artists (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  image_url TEXT,
  genres TEXT[],
  followers INTEGER,
  popularity INTEGER,
  spotify_url TEXT,
  spotify_id TEXT,
  stored_tracks JSONB,
  tracks_last_updated TIMESTAMP WITH TIME ZONE,
  upcoming_shows INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create top_tracks table (from Spotify)
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

-- Create artist_songs table (more complete song catalog)
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

-- Create venues table (from Ticketmaster)
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

-- Create shows table (from Ticketmaster)
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

-- Create setlists table (for voting on song setlists)
CREATE TABLE IF NOT EXISTS setlists (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4(),
  show_id TEXT NOT NULL REFERENCES shows(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create setlist_songs table (for songs in a setlist)
CREATE TABLE IF NOT EXISTS setlist_songs (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4(),
  setlist_id TEXT NOT NULL REFERENCES setlists(id) ON DELETE CASCADE,
  track_id TEXT NOT NULL REFERENCES top_tracks(id) ON DELETE CASCADE,
  votes INTEGER DEFAULT 0,
  suggested_by TEXT REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create votes table (for tracking user votes)
CREATE TABLE IF NOT EXISTS votes (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  setlist_song_id TEXT NOT NULL REFERENCES setlist_songs(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, setlist_song_id)
);

-- Create past_setlists table (for storing historical setlists)
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

-- Create homepage_features table (for featured content)
CREATE TABLE IF NOT EXISTS homepage_features (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4(),
  type TEXT NOT NULL, -- 'artist', 'show', 'setlist'
  reference_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  order_index INTEGER,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create job_logs table (for tracking background jobs)
CREATE TABLE IF NOT EXISTS job_logs (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_name TEXT NOT NULL,
  status TEXT NOT NULL,
  message TEXT,
  data JSONB,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Create indices for performance
CREATE INDEX IF NOT EXISTS idx_profiles_provider_id ON profiles(provider_id);
CREATE INDEX IF NOT EXISTS idx_artists_name ON artists(name);
CREATE INDEX IF NOT EXISTS idx_artists_spotify_id ON artists(spotify_id);
CREATE INDEX IF NOT EXISTS idx_artists_spotify_url ON artists(spotify_url);
CREATE INDEX IF NOT EXISTS idx_artist_songs_artist_id ON artist_songs(artist_id);
CREATE INDEX IF NOT EXISTS idx_artist_songs_is_top_track ON artist_songs(is_top_track);
CREATE INDEX IF NOT EXISTS idx_top_tracks_artist_id ON top_tracks(artist_id);
CREATE INDEX IF NOT EXISTS idx_shows_artist_id ON shows(artist_id);
CREATE INDEX IF NOT EXISTS idx_shows_date ON shows(date);
CREATE INDEX IF NOT EXISTS idx_shows_venue_id ON shows(venue_id);
CREATE INDEX IF NOT EXISTS idx_venues_name_city ON venues(name, city);
CREATE INDEX IF NOT EXISTS idx_setlists_show_id ON setlists(show_id);
CREATE INDEX IF NOT EXISTS idx_setlist_songs_setlist_id ON setlist_songs(setlist_id);
CREATE INDEX IF NOT EXISTS idx_setlist_songs_track_id ON setlist_songs(track_id);
CREATE INDEX IF NOT EXISTS idx_setlist_songs_votes ON setlist_songs(votes DESC);
CREATE INDEX IF NOT EXISTS idx_votes_user_id ON votes(user_id);
CREATE INDEX IF NOT EXISTS idx_votes_setlist_song_id ON votes(setlist_song_id);
CREATE INDEX IF NOT EXISTS idx_past_setlists_artist_id ON past_setlists(artist_id);
CREATE INDEX IF NOT EXISTS idx_past_setlists_show_id ON past_setlists(show_id);
CREATE INDEX IF NOT EXISTS idx_homepage_features_type ON homepage_features(type, order_index);
CREATE INDEX IF NOT EXISTS idx_job_logs_job_name ON job_logs(job_name);
CREATE INDEX IF NOT EXISTS idx_job_logs_status ON job_logs(status);

-- Create function to increment song votes
CREATE OR REPLACE FUNCTION increment_votes(song_id TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE setlist_songs 
  SET votes = votes + 1 
  WHERE id = song_id;
END;
$$;

-- Enable Row Level Security (RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE artists ENABLE ROW LEVEL SECURITY;
ALTER TABLE top_tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE artist_songs ENABLE ROW LEVEL SECURITY;
ALTER TABLE venues ENABLE ROW LEVEL SECURITY;
ALTER TABLE shows ENABLE ROW LEVEL SECURITY;
ALTER TABLE setlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE setlist_songs ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE past_setlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE homepage_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Profiles policies
CREATE POLICY "Users can view their own profile" 
ON profiles FOR SELECT 
USING (auth.uid()::text = id);

CREATE POLICY "Users can update their own profile" 
ON profiles FOR UPDATE 
USING (auth.uid()::text = id);

-- Allow public read access to artists, top_tracks, venues, shows, and setlists
CREATE POLICY "Public read access for artists" 
ON artists FOR SELECT 
TO authenticated, anon
USING (true);

CREATE POLICY "Public read access for top_tracks" 
ON top_tracks FOR SELECT 
TO authenticated, anon
USING (true);

CREATE POLICY "Public read access for artist_songs" 
ON artist_songs FOR SELECT 
TO authenticated, anon
USING (true);

CREATE POLICY "Public read access for venues" 
ON venues FOR SELECT 
TO authenticated, anon
USING (true);

CREATE POLICY "Public read access for shows" 
ON shows FOR SELECT 
TO authenticated, anon
USING (true);

CREATE POLICY "Public read access for setlists" 
ON setlists FOR SELECT 
TO authenticated, anon
USING (true);

CREATE POLICY "Public read access for setlist_songs" 
ON setlist_songs FOR SELECT 
TO authenticated, anon
USING (true);

CREATE POLICY "Public read access for past_setlists" 
ON past_setlists FOR SELECT 
TO authenticated, anon
USING (true);

-- Votes policies
CREATE POLICY "Users can see all votes" 
ON votes FOR SELECT 
TO authenticated, anon
USING (true);

CREATE POLICY "Users can only insert their own votes" 
ON votes FOR INSERT 
TO authenticated
WITH CHECK (auth.uid()::text = user_id);

-- Create auth triggers
-- Set up a trigger to create a profile when a new user signs up via Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, full_name, avatar_url, provider, provider_id)
  VALUES (
    new.id, 
    new.raw_user_meta_data->>'preferred_username', 
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url',
    new.raw_user_meta_data->>'provider',
    new.raw_user_meta_data->>'provider_id'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to call the handle_new_user function (if it doesn't exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'on_auth_user_created'
  ) THEN
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
  END IF;
END
$$;

-- Add service role permissions
-- Create role-specific policies
CREATE POLICY "Service role can insert/update artists" 
ON artists FOR ALL 
TO service_role
USING (true);

CREATE POLICY "Service role can insert/update top_tracks" 
ON top_tracks FOR ALL 
TO service_role
USING (true);

CREATE POLICY "Service role can insert/update artist_songs" 
ON artist_songs FOR ALL 
TO service_role
USING (true);

CREATE POLICY "Service role can insert/update venues" 
ON venues FOR ALL 
TO service_role
USING (true);

CREATE POLICY "Service role can insert/update shows" 
ON shows FOR ALL 
TO service_role
USING (true);

CREATE POLICY "Service role can insert/update setlists" 
ON setlists FOR ALL 
TO service_role
USING (true);

CREATE POLICY "Service role can insert/update setlist_songs" 
ON setlist_songs FOR ALL 
TO service_role
USING (true);

CREATE POLICY "Service role can insert/update votes" 
ON votes FOR ALL 
TO service_role
USING (true);

CREATE POLICY "Service role can manage homepage features" 
ON homepage_features FOR ALL 
TO service_role
USING (true);

CREATE POLICY "Service role can manage job logs" 
ON job_logs FOR ALL 
TO service_role
USING (true);

-- Add additional custom functions
-- Update the last_updated timestamp on artists table
CREATE OR REPLACE FUNCTION update_artists_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update timestamp when artist is updated
CREATE TRIGGER update_artists_updated_at
  BEFORE UPDATE ON artists
  FOR EACH ROW EXECUTE FUNCTION update_artists_updated_at();
  
-- Update the updated_at timestamp on shows table
CREATE OR REPLACE FUNCTION update_shows_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update timestamp when show is updated
CREATE TRIGGER update_shows_updated_at
  BEFORE UPDATE ON shows
  FOR EACH ROW EXECUTE FUNCTION update_shows_updated_at();

-- Update the last_updated timestamp on setlists table
CREATE OR REPLACE FUNCTION update_setlists_last_updated()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_updated = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update timestamp when setlist is updated
CREATE TRIGGER update_setlists_last_updated
  BEFORE UPDATE ON setlists
  FOR EACH ROW EXECUTE FUNCTION update_setlists_last_updated();
