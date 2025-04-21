-- Add composite indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_shows_artist_date ON shows(artist_id, date);
CREATE INDEX IF NOT EXISTS idx_shows_popularity_date ON shows(popularity DESC, date DESC);

-- Add or update columns for external service IDs
ALTER TABLE shows
  ADD COLUMN IF NOT EXISTS venue_ticketmaster_id TEXT,
  ADD COLUMN IF NOT EXISTS popularity INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS status TEXT;

-- Add foreign key constraints
ALTER TABLE shows
  ADD CONSTRAINT fk_venue_ticketmaster
  FOREIGN KEY (venue_ticketmaster_id)
  REFERENCES venues(ticketmaster_id);

-- Add function to calculate show popularity
CREATE OR REPLACE FUNCTION calculate_show_popularity()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate popularity based on multiple factors
  NEW.popularity = COALESCE(
    (SELECT
      -- Base popularity from artist
      COALESCE(a.popularity, 0) * 0.5 +
      -- Bonus for recent shows
      CASE
        WHEN NEW.date > NOW() - INTERVAL '7 days' THEN 30
        WHEN NEW.date > NOW() - INTERVAL '30 days' THEN 20
        WHEN NEW.date > NOW() - INTERVAL '90 days' THEN 10
        ELSE 0
      END +
      -- Bonus for having ticket info
      CASE WHEN NEW.ticket_url IS NOT NULL THEN 10 ELSE 0 END
    FROM artists a
    WHERE a.id = NEW.artist_id
    ), 0);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for popularity calculation
DROP TRIGGER IF EXISTS update_show_popularity ON shows;
CREATE TRIGGER update_show_popularity
  BEFORE INSERT OR UPDATE ON shows
  FOR EACH ROW
  EXECUTE FUNCTION calculate_show_popularity();