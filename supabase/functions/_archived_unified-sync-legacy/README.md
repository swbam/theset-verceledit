# Unified Sync System

This Edge Function provides a unified sync system for The Set, handling data synchronization with multiple external APIs (Ticketmaster, Spotify, and Setlist.fm) and maintaining consistency across the application's database.

## Features

- **Artist Sync**
  - Fetches artist details from Spotify
  - Retrieves artist's track catalog
  - Gets upcoming shows from Ticketmaster
  - Imports historical setlists from Setlist.fm

- **Show Sync**
  - Creates show records with venue details
  - Automatically generates setlists
  - Links to artists and venues

- **Venue Sync**
  - Stores venue information
  - Handles location data
  - Links to Ticketmaster venues

- **Song Sync**
  - Manages song database
  - Links to Spotify tracks
  - Handles setlist song entries

## Usage

### Endpoint

```
POST /functions/v1/unified-sync
```

### Request Format

```typescript
interface SyncRequest {
  entityType: 'artist' | 'venue' | 'show' | 'song';
  entityId?: string;
  entityName?: string;
  ticketmasterId?: string;
  spotifyId?: string;
  options?: {
    forceRefresh?: boolean;
    skipDependencies?: boolean;
  };
}
```

### Examples

1. Sync Artist by Name:
```json
{
  "entityType": "artist",
  "entityName": "The Beatles"
}
```

2. Sync Show with Ticketmaster ID:
```json
{
  "entityType": "show",
  "ticketmasterId": "G5diZ9N0O0x_A"
}
```

3. Sync Venue:
```json
{
  "entityType": "venue",
  "entityName": "Madison Square Garden",
  "ticketmasterId": "KovZpZA7AAEA"
}
```

4. Sync Song with Spotify ID:
```json
{
  "entityType": "song",
  "entityName": "Yesterday",
  "spotifyId": "3BQHpFgAp4l80e1XslIjNI"
}
```

## Environment Variables

Required environment variables (see .env.example):
- SUPABASE_URL
- SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY
- TICKETMASTER_API_KEY
- SPOTIFY_CLIENT_ID
- SPOTIFY_CLIENT_SECRET
- SETLISTFM_API_KEY

## Database Tables

The sync system interacts with these main tables:
- artists
- shows
- venues
- songs
- setlists
- setlist_songs

## Error Handling

- All API calls include retry logic
- Detailed error logging
- Graceful fallbacks when services are unavailable
- Transaction support for data consistency

## Rate Limiting

The system respects rate limits for all external APIs:
- Ticketmaster: 5000 requests per day
- Spotify: 3600 requests per hour
- Setlist.fm: 2 requests per second

## Caching

- API responses are cached to minimize external calls
- Cache invalidation on force refresh
- Configurable TTL for different entity types

## Dependencies

The sync system uses these shared utilities:
- ticketmasterUtils.ts
- spotifyUtils.ts
- setlistFmUtils.ts
- setlistSongUtils.ts
- databaseUtils.ts
- songDbUtils.ts

## Development

To run locally:
1. Copy .env.example to .env
2. Fill in your API keys
3. Deploy to Supabase Edge Functions:
   ```bash
   supabase functions deploy unified-sync
   ```

## Testing

Test the endpoint with curl:
```bash
curl -X POST https://[PROJECT_REF].supabase.co/functions/v1/unified-sync \
  -H "Authorization: Bearer [ANON_KEY]" \
  -H "Content-Type: application/json" \
  -d '{"entityType": "artist", "entityName": "The Beatles"}'
