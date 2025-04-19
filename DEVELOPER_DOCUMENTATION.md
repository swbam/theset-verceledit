# TheSet - Developer Documentation

## Application Overview

TheSet is a full-featured music event discovery platform that integrates with multiple external APIs to provide users with comprehensive information about artists, venues, shows, and setlists. The application is built using a modern tech stack centered around React, Vite, and Supabase.

### Core Features

- Artist discovery and profile viewing
- Show/event browsing with venue information
- Setlist viewing and analysis
- User authentication and personalization
- External API integrations (Spotify, Ticketmaster, Setlist.fm)

## Tech Stack

- **Frontend**: React + Vite
- **UI Components**: Radix UI
- **Database**: Supabase PostgreSQL
- **Authentication**: Supabase Auth
- **Serverless Functions**: Supabase Edge Functions
- **Hosting**: Vercel

## Recent Updates (April 2025)

The application has been updated to use specific service IDs (spotify_id, setlist_fm_id, ticketmaster_id) instead of generic external_id fields. This change improves data integrity, query performance, and integration with external APIs.

### Key Changes

1. Updated database schema to use specific service ID columns
2. Refactored Edge Functions to work with the new schema
3. Updated frontend code to use specific service IDs
4. Added unique constraints to service ID columns
5. Improved error handling and data transformation

## Database Schema

### Core Tables

#### Artists
```sql
CREATE TABLE public.artists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  ticketmaster_id TEXT UNIQUE,
  spotify_id TEXT UNIQUE,
  setlist_fm_id TEXT UNIQUE,
  image_url TEXT,
  url TEXT,
  genres TEXT[],
  popularity INTEGER,
  followers INTEGER,
  stored_tracks JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

#### Venues
```sql
CREATE TABLE public.venues (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT,
  country TEXT,
  address TEXT,
  postal_code TEXT,
  latitude TEXT,
  longitude TEXT,
  image_url TEXT,
  url TEXT,
  ticketmaster_id TEXT UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

#### Shows
```sql
CREATE TABLE public.shows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  artist_id UUID REFERENCES public.artists(id),
  venue_id UUID REFERENCES public.venues(id),
  ticketmaster_id TEXT UNIQUE,
  date TEXT,
  status TEXT,
  url TEXT,
  image_url TEXT,
  ticket_url TEXT,
  popularity INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  last_updated TEXT
);
```

#### Setlists
```sql
CREATE TABLE public.setlists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  artist_id UUID REFERENCES public.artists(id),
  show_id UUID REFERENCES public.shows(id),
  venue_id UUID REFERENCES public.venues(id),
  setlist_fm_id TEXT UNIQUE,
  tour_name TEXT,
  date TEXT,
  songs JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

#### Songs
```sql
CREATE TABLE public.songs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  artist_id UUID REFERENCES public.artists(id),
  spotify_id TEXT UNIQUE,
  preview_url TEXT,
  duration_ms INTEGER,
  popularity INTEGER,
  album_name TEXT,
  album_image_url TEXT,
  vote_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

### Auxiliary Tables

#### Sync States
```sql
CREATE TABLE public.sync_states (
  entity_id TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  service_name TEXT,
  service_id TEXT,
  last_synced TIMESTAMP WITH TIME ZONE DEFAULT now(),
  sync_version INTEGER DEFAULT 1,
  PRIMARY KEY (entity_id, entity_type)
);
```

#### Sync Queue
```sql
CREATE TABLE public.sync_queue (
  id SERIAL PRIMARY KEY,
  entity_type TEXT NOT NULL,
  service_name TEXT,
  service_id TEXT,
  reference_data JSONB,
  priority INTEGER DEFAULT 5,
  max_attempts INTEGER DEFAULT 3,
  status TEXT DEFAULT 'pending',
  attempts INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

## Row Level Security (RLS) Policies

The application uses Supabase RLS policies to secure data access:

### Artists Table
```sql
-- Allow public read access
CREATE POLICY "Allow public read access to artists" ON public.artists
  FOR SELECT USING (true);

-- Allow service role to modify artists
CREATE POLICY "Allow service role to modify artists" ON public.artists
  FOR ALL TO service_role USING (true);
```

Similar policies exist for venues, shows, setlists, and songs tables.

## Supabase Edge Functions

The application uses Supabase Edge Functions for serverless API integrations. These functions are deployed to the Supabase project and can be invoked via HTTP requests.

### Function: import-artist

**Purpose**: Imports artist data from Ticketmaster and optionally Spotify.

**Endpoint**: `https://<project-ref>.supabase.co/functions/v1/import-artist`

**Request Body**:
```json
{
  "name": "Artist Name",
  "id": "TicketmasterID",
  "spotify_id": "Optional SpotifyID"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Artist import process finished. Shows processed: 22, Saved/Updated: 22, Failed: 0.",
  "artist": {
    "id": "uuid",
    "name": "Artist Name",
    "ticketmaster_id": "TicketmasterID",
    "spotify_id": "SpotifyID",
    "...other fields": "..."
  },
  "savedShows": 22,
  "failedShows": 0,
  "errors": []
}
```

**Implementation Details**:
- Located at `/supabase/functions/import-artist/index.ts`
- Uses Ticketmaster API to fetch artist events
- Optionally uses Spotify API to enrich artist data
- Saves artist, venues, and shows to the database
- Uses specific service IDs (ticketmaster_id, spotify_id) for data integrity

### Function: sync-setlist

**Purpose**: Fetches and syncs setlist data from Setlist.fm API.

**Endpoint**: `https://<project-ref>.supabase.co/functions/v1/sync-setlist`

**Request Body**:
```json
{
  "setlist_fm_id": "SetlistFmID"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Setlist synced successfully",
  "setlist": {
    "id": "uuid",
    "setlist_fm_id": "SetlistFmID",
    "artist_id": "ArtistID",
    "...other fields": "..."
  }
}
```

**Implementation Details**:
- Located at `/supabase/functions/sync-setlist/index.ts`
- Uses Setlist.fm API to fetch setlist data
- Resolves artist and venue relationships
- Saves setlist and songs to the database
- Uses specific service ID (setlist_fm_id) for data integrity

## Shared Utilities

The Edge Functions share common utilities located in `/supabase/functions/_shared/`:

### Types

Located at `/supabase/functions/_shared/types.ts`, these TypeScript interfaces define the data structures used throughout the application:

```typescript
export interface Artist {
  id: string;
  name: string;
  ticketmaster_id?: string;
  spotify_id?: string;
  setlist_fm_id?: string;
  image_url?: string;
  url?: string;
  genres?: string[];
  popularity?: number;
  followers?: number;
  stored_tracks?: any;
  created_at?: string;
  updated_at?: string;
}

export interface Venue { /* ... */ }
export interface Show { /* ... */ }
export interface Setlist { /* ... */ }
export interface Song { /* ... */ }
```

### Database Utilities

Located at `/supabase/functions/_shared/databaseUtils.ts`, these functions handle database operations:

```typescript
export async function saveArtistToDatabase(artistInput: Partial<Artist>): Promise<Artist | null> {
  // Implementation details
}

export async function saveVenueToDatabase(venueInput: Partial<Venue>): Promise<Venue | null> {
  // Implementation details
}

export async function saveShowToDatabase(showInput: Partial<Show> & {
  artist?: Partial<Artist>;
  venue?: Partial<Venue>;
}): Promise<Show | null> {
  // Implementation details
}
```

## Sync Manager

The application includes a sync manager system that handles background synchronization of data from external APIs.

### Sync States

The `sync_states` table tracks the synchronization status of entities:

```typescript
interface SyncState {
  entity_id: string;      // UUID of the entity
  entity_type: string;    // Type of entity (artist, venue, show, setlist)
  service_name: string;   // Name of the service (ticketmaster, spotify, setlist_fm)
  service_id: string;     // ID of the entity in the external service
  last_synced: string;    // Timestamp of last sync
  sync_version: number;   // Version of the sync process
}
```

### Sync Queue

The `sync_queue` table manages pending synchronization tasks:

```typescript
interface SyncQueueItem {
  id: number;             // Auto-incrementing ID
  entity_type: string;    // Type of entity to sync
  service_name: string;   // Name of the service to sync from
  service_id: string;     // ID of the entity in the external service
  reference_data: any;    // Additional data for the sync process
  priority: number;       // Priority of the sync task (lower = higher priority)
  max_attempts: number;   // Maximum number of retry attempts
  status: string;         // Status of the sync task (pending, processing, completed, failed)
  attempts: number;       // Number of attempts made
  created_at: string;     // Timestamp of creation
  updated_at: string;     // Timestamp of last update
}
```

### Sync Functions

The application includes database functions for managing the sync process:

```sql
-- Enqueues a sync task
CREATE OR REPLACE FUNCTION public.enqueue_sync(
  entity_type text,
  service_name text,
  service_id text,
  reference_data jsonb DEFAULT NULL::jsonb,
  priority integer DEFAULT 5,
  max_attempts integer DEFAULT 3
) RETURNS integer;

-- Creates sync tables if they don't exist
CREATE OR REPLACE FUNCTION public.create_sync_tables()
 RETURNS void;

-- Tests the sync system
CREATE OR REPLACE FUNCTION public.test_sync_system(
  target_id text,
  entity_type text
) RETURNS jsonb;
```

## Environment Variables

The application requires the following environment variables:

```
# Supabase
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>

# External APIs
TICKETMASTER_API_KEY=<ticketmaster-api-key>
SETLIST_FM_API_KEY=<setlist-fm-api-key>
SPOTIFY_CLIENT_ID=<spotify-client-id>
SPOTIFY_CLIENT_SECRET=<spotify-client-secret>
```

## Deployment

The application is deployed on Vercel with the following configuration:

- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Development Command**: `npm run dev`
- **Install Command**: `npm install`

The Supabase Edge Functions are deployed separately using the Supabase CLI:

```bash
supabase functions deploy import-artist --project-ref <project-ref>
supabase functions deploy sync-setlist --project-ref <project-ref>
```

## Known Issues and Future Improvements

1. **Setlist.fm Integration**: The `sync-setlist` function has an "Invalid time value" error that needs to be fixed. Date parsing from Setlist.fm API needs to be improved.

2. **Frontend References**: There may still be some references to `external_id` in the frontend code that need to be updated. Some components might need to be updated to use the specific service IDs.

3. **Database Queries**: Some SQL queries in the application might still reference `external_id` columns. These need to be identified and updated to use the specific service IDs.

4. **Testing Coverage**: More comprehensive testing is needed for all Edge Functions. Edge cases like null values or missing IDs should be tested.

5. **Documentation**: Update documentation to reflect the new schema design. Add comments to explain the use of specific service IDs.

## Conclusion

TheSet is a robust application that integrates with multiple external APIs to provide a comprehensive music event discovery platform. The recent updates to use specific service IDs have improved data integrity and query performance. The application is well-structured and follows modern development practices, making it easy to maintain and extend.
