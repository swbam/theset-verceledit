-- Enable Row Level Security on all public tables
ALTER TABLE public.venues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.songs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.setlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.setlist_songs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.artists ENABLE ROW LEVEL SECURITY;

-- Create policies for venues table
CREATE POLICY "Venues are viewable by everyone" 
ON public.venues FOR SELECT 
USING (true);

CREATE POLICY "Venues are insertable by authenticated users" 
ON public.venues FOR INSERT 
TO authenticated
WITH CHECK (true);

CREATE POLICY "Venues are updatable by authenticated users" 
ON public.venues FOR UPDATE 
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Venues are deletable by authenticated users" 
ON public.venues FOR DELETE 
TO authenticated
USING (true);

-- Create policies for songs table
CREATE POLICY "Songs are viewable by everyone" 
ON public.songs FOR SELECT 
USING (true);

CREATE POLICY "Songs are insertable by authenticated users" 
ON public.songs FOR INSERT 
TO authenticated
WITH CHECK (true);

CREATE POLICY "Songs are updatable by authenticated users" 
ON public.songs FOR UPDATE 
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Songs are deletable by authenticated users" 
ON public.songs FOR DELETE 
TO authenticated
USING (true);

-- Create policies for setlists table
CREATE POLICY "Setlists are viewable by everyone" 
ON public.setlists FOR SELECT 
USING (true);

CREATE POLICY "Setlists are insertable by authenticated users" 
ON public.setlists FOR INSERT 
TO authenticated
WITH CHECK (true);

CREATE POLICY "Setlists are updatable by authenticated users" 
ON public.setlists FOR UPDATE 
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Setlists are deletable by authenticated users" 
ON public.setlists FOR DELETE 
TO authenticated
USING (true);

-- Create policies for shows table
CREATE POLICY "Shows are viewable by everyone" 
ON public.shows FOR SELECT 
USING (true);

CREATE POLICY "Shows are insertable by authenticated users" 
ON public.shows FOR INSERT 
TO authenticated
WITH CHECK (true);

CREATE POLICY "Shows are updatable by authenticated users" 
ON public.shows FOR UPDATE 
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Shows are deletable by authenticated users" 
ON public.shows FOR DELETE 
TO authenticated
USING (true);

-- Create policies for setlist_songs table
CREATE POLICY "Setlist songs are viewable by everyone" 
ON public.setlist_songs FOR SELECT 
USING (true);

CREATE POLICY "Setlist songs are insertable by authenticated users" 
ON public.setlist_songs FOR INSERT 
TO authenticated
WITH CHECK (true);

CREATE POLICY "Setlist songs are updatable by authenticated users" 
ON public.setlist_songs FOR UPDATE 
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Setlist songs are deletable by authenticated users" 
ON public.setlist_songs FOR DELETE 
TO authenticated
USING (true);

-- Create policies for artists table
CREATE POLICY "Artists are viewable by everyone" 
ON public.artists FOR SELECT 
USING (true);

CREATE POLICY "Artists are insertable by authenticated users" 
ON public.artists FOR INSERT 
TO authenticated
WITH CHECK (true);

CREATE POLICY "Artists are updatable by authenticated users" 
ON public.artists FOR UPDATE 
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Artists are deletable by authenticated users" 
ON public.artists FOR DELETE 
TO authenticated
USING (true);

-- Note: If you want to restrict certain operations to admins only,
-- you'll need to create a custom approach since there's no is_admin column.
-- Options include:
-- 1. Add an is_admin column to auth.users
-- 2. Create a separate admins table with user_id references
-- 3. Use a specific role for admins