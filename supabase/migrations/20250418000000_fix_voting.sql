-- Drop existing vote functions
DROP FUNCTION IF EXISTS increment_vote;
DROP FUNCTION IF EXISTS decrement_vote;

-- Create a transaction-safe increment vote function
CREATE OR REPLACE FUNCTION increment_vote(p_song_id uuid, p_user_id uuid)
RETURNS void AS $$
BEGIN
  -- Lock the song row to prevent concurrent updates
  PERFORM pg_advisory_xact_lock(hashtext(p_song_id::text));
  
  -- Insert or update vote count
  INSERT INTO votes (song_id, user_id, count)
  VALUES (p_song_id, p_user_id, 1)
  ON CONFLICT (song_id, user_id) 
  DO UPDATE SET count = votes.count + 1;
  
  -- Update the total vote count
  UPDATE played_setlist_songs
  SET vote_count = (
    SELECT COALESCE(SUM(count), 0)
    FROM votes
    WHERE song_id = p_song_id
  )
  WHERE song_id = p_song_id;
END;
$$ LANGUAGE plpgsql;

-- Create a transaction-safe decrement vote function
CREATE OR REPLACE FUNCTION decrement_vote(p_song_id uuid, p_user_id uuid)
RETURNS void AS $$
BEGIN
  -- Lock the song row to prevent concurrent updates
  PERFORM pg_advisory_xact_lock(hashtext(p_song_id::text));
  
  -- Update vote count
  UPDATE votes
  SET count = greatest(count - 1, 0)
  WHERE song_id = p_song_id AND user_id = p_user_id;
  
  -- Update the total vote count
  UPDATE played_setlist_songs
  SET vote_count = (
    SELECT COALESCE(SUM(count), 0)
    FROM votes
    WHERE song_id = p_song_id
  )
  WHERE song_id = p_song_id;
END;
$$ LANGUAGE plpgsql;

-- Add missing indexes
CREATE INDEX IF NOT EXISTS idx_shows_artist_id ON shows(artist_id);
CREATE INDEX IF NOT EXISTS idx_setlists_artist_id ON setlists(artist_id);
CREATE INDEX IF NOT EXISTS idx_played_setlist_songs_setlist_id ON played_setlist_songs(setlist_id);
CREATE INDEX IF NOT EXISTS idx_votes_song_id ON votes(song_id);
CREATE INDEX IF NOT EXISTS idx_votes_user_id ON votes(user_id);

-- Add basic RLS policies
ALTER TABLE artists ENABLE ROW LEVEL SECURITY;
ALTER TABLE shows ENABLE ROW LEVEL SECURITY;
ALTER TABLE setlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE played_setlist_songs ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Public artists are viewable by everyone" ON artists
  FOR SELECT USING (true);

CREATE POLICY "Public shows are viewable by everyone" ON shows
  FOR SELECT USING (true);

CREATE POLICY "Public setlists are viewable by everyone" ON setlists
  FOR SELECT USING (true);

CREATE POLICY "Public played setlist songs are viewable by everyone" ON played_setlist_songs
  FOR SELECT USING (true);

CREATE POLICY "Users can view all votes" ON votes
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can vote" ON votes
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can modify their own votes" ON votes
  FOR UPDATE USING (auth.uid() = user_id);