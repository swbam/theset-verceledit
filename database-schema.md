# Supabase Database Schema for Sync System

This document outlines the database tables required for the concert setlist voting app's sync system to function properly.

## Core Entity Tables

### `artists` Table

```sql
CREATE TABLE public.artists (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    image_url TEXT,
    url TEXT,
    spotify_id TEXT,
    spotify_url TEXT,
    genres JSONB DEFAULT '[]'::jsonb,
    popularity INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create index for faster name searches
CREATE INDEX idx_artists_name ON public.artists USING gin (name gin_trgm_ops);
```

### `venues` Table

```sql
CREATE TABLE public.venues (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    city TEXT,
    state TEXT,
    country TEXT,
    address TEXT,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    url TEXT,
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create indexes for location-based queries
CREATE INDEX idx_venues_city ON public.venues (city);
CREATE INDEX idx_venues_state ON public.venues (state);
CREATE INDEX idx_venues_name ON public.venues USING gin (name gin_trgm_ops);
```

### `shows` Table

```sql
CREATE TABLE public.shows (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    date TIMESTAMP WITH TIME ZONE,
    artist_id TEXT REFERENCES public.artists(id),
    venue_id TEXT REFERENCES public.venues(id),
    setlist_id TEXT,
    status TEXT DEFAULT 'active',
    url TEXT,
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create indexes for related entities and date-based queries
CREATE INDEX idx_shows_artist_id ON public.shows (artist_id);
CREATE INDEX idx_shows_venue_id ON public.shows (venue_id);
CREATE INDEX idx_shows_date ON public.shows (date);
CREATE INDEX idx_shows_setlist_id ON public.shows (setlist_id);
```

### `setlists` Table

```sql
CREATE TABLE public.setlists (
    id TEXT PRIMARY KEY,
    artist_id TEXT REFERENCES public.artists(id),
    show_id TEXT REFERENCES public.shows(id),
    songs JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create indexes for related entities
CREATE INDEX idx_setlists_artist_id ON public.setlists (artist_id);
CREATE INDEX idx_setlists_show_id ON public.setlists (show_id);
```

### `songs` Table

```sql
CREATE TABLE public.songs (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    artist_id TEXT REFERENCES public.artists(id),
    spotify_id TEXT,
    spotify_url TEXT,
    preview_url TEXT,
    duration_ms INTEGER,
    popularity INTEGER,
    album_name TEXT,
    album_image TEXT,
    encore INTEGER DEFAULT 0,
    position INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create indexes for related entities and searches
CREATE INDEX idx_songs_artist_id ON public.songs (artist_id);
CREATE INDEX idx_songs_name ON public.songs USING gin (name gin_trgm_ops);
```

## Sync System Tables

### `sync_states` Table

Tracks the sync state of each entity for incremental sync purposes.

```sql
CREATE TABLE public.sync_states (
    entity_id TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    last_synced TIMESTAMP WITH TIME ZONE DEFAULT now(),
    sync_version INTEGER DEFAULT 1,
    PRIMARY KEY (entity_id, entity_type)
);

-- Create index for entity type to allow filtering sync states by type
CREATE INDEX idx_sync_states_entity_type ON public.sync_states (entity_type);
```

### `sync_queue` Table

Stores pending sync tasks for asynchronous processing.

```sql
CREATE TABLE public.sync_queue (
    id SERIAL PRIMARY KEY,
    entity_id TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    operation TEXT NOT NULL,
    priority TEXT NOT NULL,
    attempts INTEGER DEFAULT 0,
    payload JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create indexes for efficient queue processing
CREATE INDEX idx_sync_queue_priority ON public.sync_queue (priority);
CREATE INDEX idx_sync_queue_entity ON public.sync_queue (entity_type, entity_id);
```

### `api_cache` Table (Optional, for longer-term caching)

Stores cached API responses for reducing external API calls.

```sql
CREATE TABLE public.api_cache (
    cache_key TEXT PRIMARY KEY,
    data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create index for cache expiration cleanup
CREATE INDEX idx_api_cache_created_at ON public.api_cache (created_at);
```

## Row-Level Security Policies

To ensure proper security, apply these RLS policies:

```sql
-- Enable RLS on all tables
ALTER TABLE public.artists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.setlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.songs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_cache ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users 
-- (adjust based on your app's specific access control needs)

-- Example: All authenticated users can read artists
CREATE POLICY "Anyone can read artists" 
ON public.artists FOR SELECT 
TO authenticated 
USING (true);

-- Example: Only admins can modify sync states
CREATE POLICY "Only admins can modify sync states" 
ON public.sync_states
USING (auth.uid() IN (SELECT user_id FROM public.admins));
```

## Database Migrations

When setting up the application for the first time, run these SQL statements in the Supabase SQL editor or use a database migration tool to create the required schema.

## Notes for Developers

1. Make sure to create the necessary extensions:
   ```sql
   CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For text search
   ```

2. The `sync_queue` table is used for persisting sync tasks between server restarts.

3. The `sync_states` table keeps track of when each entity was last synced, allowing the system to only update data when needed.

4. The schema includes foreign key relationships between entities to maintain data integrity.

5. Additional application-specific tables may be needed for features like user votes, favorites, etc. 