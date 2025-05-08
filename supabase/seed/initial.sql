-- Seed data for initial database setup
-- This file will be run when executing `supabase db reset`

-- Sample admin users
INSERT INTO public.admins (email, created_at, updated_at)
VALUES 
  ('admin@theset.live', NOW(), NOW()),
  ('dev@theset.live', NOW(), NOW())
ON CONFLICT (email) DO NOTHING;

-- Sample artists data
-- This would typically be populated from artist.csv
-- Format: Manually load data from artist.csv or add sample data here
INSERT INTO public.artists (name, ticketmaster_id, spotify_id, created_at, updated_at)
VALUES 
  ('Taylor Swift', 'K8vZ917G2_0', '06HL4z0CvFAxyc27GXpf02', NOW(), NOW()),
  ('Beyoncé', 'K8vZ9175tB7', '6vWDO969PvNqNYHIOW5v0m', NOW(), NOW()),
  ('Foo Fighters', 'K8vZ9172ht0', '7jy3rLJdDQY21OgRLCZ9sD', NOW(), NOW())
ON CONFLICT (ticketmaster_id) DO NOTHING;

-- Sample venues
INSERT INTO public.venues (name, ticketmaster_id, city, state, country, created_at, updated_at)
VALUES 
  ('Madison Square Garden', 'KovZpZA7AAEA', 'New York', 'NY', 'US', NOW(), NOW()),
  ('Staples Center', 'KovZpZAJledA', 'Los Angeles', 'CA', 'US', NOW(), NOW()),
  ('O2 Arena', 'KovZpZAJelFA', 'London', '', 'UK', NOW(), NOW())
ON CONFLICT (ticketmaster_id) DO NOTHING;

-- Sample shows
INSERT INTO public.shows (artist_id, venue_id, name, date, ticketmaster_id, created_at, updated_at)
SELECT 
  a.id, 
  v.id, 
  a.name || ' at ' || v.name, 
  (NOW() + INTERVAL '30 days')::date, 
  'K8vZ917' || floor(random() * 1000000)::text,
  NOW(), 
  NOW()
FROM 
  public.artists a
CROSS JOIN 
  public.venues v
LIMIT 5
ON CONFLICT (ticketmaster_id) DO NOTHING;

-- Sample songs
INSERT INTO public.songs (name, artist_id, spotify_id, vote_count, created_at, updated_at)
SELECT 
  'Song ' || floor(random() * 100)::text,
  a.id,
  'spotify:' || floor(random() * 10000000)::text,
  floor(random() * 100)::integer,
  NOW(),
  NOW()
FROM 
  public.artists a,
  generate_series(1, 10) i
ON CONFLICT (spotify_id, artist_id) DO NOTHING; 