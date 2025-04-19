# Unified Sync Function

This function provides a simplified approach to synchronizing data between external sources (Ticketmaster, Spotify) and our Supabase database. It replaces the previous multi-function orchestration system with a single, more reliable endpoint.

## Features

- Single function handling all entity types (artist, venue, show, song)
- Automatic dependency tracking (e.g. artist → shows → venues)
- More reliable error handling
- Simplified logging and status tracking

## Usage

Call this function with a JSON payload containing:

```json
{
  "entityType": "artist", // required - one of "artist", "venue", "show", "song"
  "entityId": "uuid", // optional - database UUID if updating existing entity
  "entityName": "string", // optional - name of entity (required for new entities)
  "ticketmasterId": "string", // optional - Ticketmaster ID
  "spotifyId": "string", // optional - Spotify ID
  "options": {
    "forceRefresh": false, // optional - force external API calls even if entity exists
    "skipDependencies": false // optional - don't fetch related entities
  }
}
```

### Example: Sync Artist by Name

```typescript
const { data, error } = await supabase.functions.invoke('unified-sync', {
  body: {
    entityType: 'artist',
    entityName: 'Taylor Swift'
  }
});
```

### Example: Sync Venue by Ticketmaster ID

```typescript
const { data, error } = await supabase.functions.invoke('unified-sync', {
  body: {
    entityType: 'venue',
    ticketmasterId: 'KovZpZAFaJeA' // Example Ticketmaster venue ID
  }
});
```

## Response Format

The function returns a JSON response with this structure:

```json
{
  "success": true,
  "data": {
    // For artists:
    "artist": { /* artist object */ },
    "shows": [ /* array of shows */ ],
    "syncedAt": "ISO date string"
    
    // For venues:
    "venue": { /* venue object */ },
    "syncedAt": "ISO date string"
    
    // For shows:
    "show": { /* show object */ },
    "syncedAt": "ISO date string"
    
    // For songs:
    "song": { /* song object */ },
    "syncedAt": "ISO date string"
  }
}
```

## Error Handling

If an error occurs, the function returns:

```json
{
  "success": false,
  "error": "Error message"
}
```

## Migration from Previous System

This function replaces the previous orchestration system that used multiple functions. To migrate:

1. Replace calls to `orchestrate-sync` with calls to `unified-sync`
2. Update any direct calls to entity-specific functions (e.g. `sync-artist`) to use `unified-sync` instead
3. The new function handles dependencies automatically, so no need for separate dependency management

## Admin Interface

An admin testing interface is available at `/admin/sync-test` for testing the sync process with different parameters. 