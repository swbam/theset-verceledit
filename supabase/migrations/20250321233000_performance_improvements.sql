-- Performance Improvements Migration

-- 1. Add composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_shows_artist_date ON shows(artist_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_setlist_songs_setlist_votes ON setlist_songs(setlist_id, votes DESC);
CREATE INDEX IF NOT EXISTS idx_votes_user_song ON votes(user_id, setlist_song_id);

-- 2. Add partial index for upcoming shows (more efficient filtering)
CREATE INDEX IF NOT EXISTS idx_upcoming_shows 
ON shows(artist_id, date) 
WHERE date > NOW();

-- 3. GIN index for JSONB stored_tracks for faster JSON property searches
CREATE INDEX IF NOT EXISTS idx_artists_stored_tracks 
ON artists USING GIN (stored_tracks);

-- 4. Create materialized view for top voted songs across all artists
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_top_voted_songs AS
SELECT 
  ss.id AS song_id,
  ss.track_id,
  t.name AS song_name,
  a.id AS artist_id,
  a.name AS artist_name,
  COUNT(v.id) AS vote_count,
  s.id AS show_id,
  s.date AS show_date,
  s.name AS show_name,
  v.venue_id,
  v.name AS venue_name
FROM setlist_songs ss
JOIN votes vt ON ss.id = vt.setlist_song_id
JOIN top_tracks t ON ss.track_id = t.id
JOIN setlists sl ON ss.setlist_id = sl.id
JOIN shows s ON sl.show_id = s.id
JOIN artists a ON s.artist_id = a.id
JOIN venues v ON s.venue_id = v.id
GROUP BY ss.id, t.name, a.id, a.name, s.id, s.date, s.name, v.venue_id, v.name
ORDER BY vote_count DESC;

-- Create index on materialized view
CREATE INDEX IF NOT EXISTS idx_mv_top_voted_songs_count 
ON mv_top_voted_songs(vote_count DESC);

CREATE INDEX IF NOT EXISTS idx_mv_top_voted_songs_artist 
ON mv_top_voted_songs(artist_id);

-- 5. Create function to refresh the materialized view
CREATE OR REPLACE FUNCTION refresh_top_voted_songs()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW mv_top_voted_songs;
END;
$$ LANGUAGE plpgsql;

-- 6. Create trigger to maintain vote counts automatically
CREATE OR REPLACE FUNCTION update_vote_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE setlist_songs
    SET votes = COALESCE(votes, 0) + 1
    WHERE id = NEW.setlist_song_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE setlist_songs
    SET votes = GREATEST(COALESCE(votes, 0) - 1, 0)
    WHERE id = OLD.setlist_song_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS vote_count_trigger ON votes;

-- Create trigger
CREATE TRIGGER vote_count_trigger
AFTER INSERT OR DELETE ON votes
FOR EACH ROW EXECUTE FUNCTION update_vote_count();

-- 7. Create artist popularity based on votes (for better recommendations)
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_artist_popularity AS
SELECT 
  a.id AS artist_id,
  a.name AS artist_name,
  COUNT(DISTINCT ss.id) AS total_songs,
  SUM(COALESCE(ss.votes, 0)) AS total_votes,
  COUNT(DISTINCT v.user_id) AS unique_voters,
  COUNT(DISTINCT sl.id) AS total_setlists,
  MAX(s.date) AS last_show_date
FROM artists a
LEFT JOIN shows s ON a.id = s.artist_id
LEFT JOIN setlists sl ON s.id = sl.show_id
LEFT JOIN setlist_songs ss ON sl.id = ss.setlist_id
LEFT JOIN votes v ON ss.id = v.setlist_song_id
GROUP BY a.id, a.name
ORDER BY total_votes DESC, unique_voters DESC;

-- Create index on artist popularity view
CREATE INDEX IF NOT EXISTS idx_mv_artist_popularity_votes 
ON mv_artist_popularity(total_votes DESC);

-- 8. Function to refresh all materialized views 
CREATE OR REPLACE FUNCTION refresh_all_materialized_views()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW mv_top_voted_songs;
  REFRESH MATERIALIZED VIEW mv_artist_popularity;
END;
$$ LANGUAGE plpgsql; 