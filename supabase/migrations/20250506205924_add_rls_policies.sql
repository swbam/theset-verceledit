-- Add Row Level Security (RLS) and policies for key tables
-- Goal: public read, authenticated write, admin UI still uses service role

-- Artists table
ALTER TABLE public.artists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read for artists" 
  ON public.artists
  FOR SELECT 
  USING (true);

CREATE POLICY "Server insert/update for artists" 
  ON public.artists
  FOR ALL 
  USING (auth.role() = 'service_role');

-- Shows table
ALTER TABLE public.shows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read for shows" 
  ON public.shows
  FOR SELECT 
  USING (true);

CREATE POLICY "Server insert/update for shows" 
  ON public.shows
  FOR ALL 
  USING (auth.role() = 'service_role');

-- Venues table
ALTER TABLE public.venues ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read for venues" 
  ON public.venues
  FOR SELECT 
  USING (true);

CREATE POLICY "Server insert/update for venues" 
  ON public.venues
  FOR ALL 
  USING (auth.role() = 'service_role');

-- Songs table
ALTER TABLE public.songs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read for songs" 
  ON public.songs
  FOR SELECT 
  USING (true);

CREATE POLICY "Server insert/update for songs" 
  ON public.songs
  FOR ALL 
  USING (auth.role() = 'service_role');

-- Setlists table
ALTER TABLE public.setlists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read for setlists" 
  ON public.setlists
  FOR SELECT 
  USING (true);

CREATE POLICY "Server insert/update for setlists" 
  ON public.setlists
  FOR ALL 
  USING (auth.role() = 'service_role');

-- Setlist songs table
ALTER TABLE public.setlist_songs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read for setlist_songs" 
  ON public.setlist_songs
  FOR SELECT 
  USING (true);

CREATE POLICY "Server insert/update for setlist_songs" 
  ON public.setlist_songs
  FOR ALL 
  USING (auth.role() = 'service_role');

-- Votes table - slightly different to allow authenticated users to vote
ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read for votes" 
  ON public.votes
  FOR SELECT 
  USING (true);

CREATE POLICY "Authenticated users can insert votes" 
  ON public.votes
  FOR INSERT 
  WITH CHECK (true);  -- Anyone can vote

CREATE POLICY "Server manage votes" 
  ON public.votes
  FOR ALL 
  USING (auth.role() = 'service_role');
