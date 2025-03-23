# Database Migrations and Sync Guide

This document provides instructions on how to manage database migrations and data synchronization for TheSet application.

## Prerequisites

- Node.js (v16+)
- npm or yarn
- Supabase CLI installed (`npm install -g supabase`)
- `.env.local` file with proper Supabase credentials:
  ```
  NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
  NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
  SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
  ```

## Migration Scripts

The following scripts are available to manage database migrations:

### 1. Push Migrations to Supabase

This script links to your Supabase project and pushes all migrations.

```bash
./scripts/push-migrations.sh
```

**What it does:**
- Links to your Supabase project
- Pushes all migrations in the `supabase/migrations` directory
- Applies migrations in the correct order

### 2. Fix Vote Functions

This script fixes the vote functions in the database by dropping and recreating them with proper parameter naming.

```bash
node scripts/fix-vote-functions.js
```

**What it does:**
- Drops existing vote functions
- Creates new vote functions with proper parameter naming
- Ensures vote functions work correctly with setlist songs

### 3. Seed Data

This script populates the database with sample data for testing.

```bash
node scripts/seed-data.js
```

**What it does:**
- Inserts sample artists (or updates existing ones)
- Creates venues
- Generates upcoming shows
- Creates past setlists with songs
- Adds random vote counts

### 4. Sync Data from External APIs

This script fetches data from external APIs (Spotify, Setlist.fm) and syncs it to your database.

```bash
node scripts/sync-data.js
```

**What it does:**
- Fetches artist data from Spotify
- Retrieves artist's top tracks
- Gets setlist information from Setlist.fm
- Creates upcoming shows for testing
- Updates the database with all fetched data

**Required Environment Variables:**
```
SPOTIFY_CLIENT_ID=your-spotify-client-id
SPOTIFY_CLIENT_SECRET=your-spotify-client-secret
SETLIST_FM_API_KEY=your-setlist-fm-api-key
```

## Migration Files

The following migration files are included in the project:

1. `20250322230200_tables_first.sql` - Creates the base tables (artists, venues, shows, songs, setlists, setlist_songs, votes)
2. `20250322230300_functions_and_indexes.sql` - Creates functions, triggers, and indexes for performance
3. `20250323000000_add_top_tracks_table.sql` - Adds the top_tracks table for storing artist's top tracks from Spotify
4. `20250323000100_update_setlist_songs.sql` - Updates the setlist_songs table with additional columns

## Typical Workflow

### Initial Setup

1. Link to your Supabase project:
   ```bash
   npx supabase link --project-ref your-project-ref
   ```

2. Push all migrations:
   ```bash
   ./scripts/push-migrations.sh
   ```

3. Fix vote functions:
   ```bash
   node scripts/fix-vote-functions.js
   ```

4. Seed the database with sample data:
   ```bash
   node scripts/seed-data.js
   ```

5. Sync data from external APIs:
   ```bash
   node scripts/sync-data.js
   ```

### Adding New Migrations

1. Create a new migration file in the `supabase/migrations` directory with a timestamp prefix
2. Push the new migration:
   ```bash
   npx supabase db push --include-all
   ```

### Troubleshooting

If you encounter issues with migrations:

1. Check the Supabase dashboard for error messages
2. Verify that your `.env.local` file has the correct credentials
3. Try running the specific migration script that's failing
4. If vote functions are causing issues, run the fix-vote-functions.js script

## Important Notes

- Always back up your database before running migrations
- The `push-migrations.sh` script should be run whenever you pull changes that include new migrations
- The `fix-vote-functions.js` script should be run if you encounter issues with vote functions
- The `seed-data.js` script is safe to run multiple times as it uses upsert operations
- The `sync-data.js` script requires API keys for Spotify and Setlist.fm to function properly