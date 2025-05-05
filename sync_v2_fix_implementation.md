# Sync V2 System Fix Implementation

This document summarizes the changes made to fix the V2 sync system based on the issues identified in the analysis.

## 1. Edge Function Improvements

### Added Show Entity Type Support
- Implemented the `syncShow` function in the `unified-sync-v2` Edge Function
- Added proper handling for 'show' entity type in the Edge Function handler
- Show sync generates setlist suggestions based on artist's stored songs from Spotify

### Database Schema Updates
- Added missing columns to the `shows` table:
  - `sync_status` - Tracks the current sync status
  - `last_sync` - Records the timestamp of the last sync attempt
  - `last_sync_error` - Stores error messages from failed syncs
  - `setlist_suggestions` - Stores suggested songs for the show based on artist popularity

## 2. Frontend Service Completion

### Implemented Missing Methods in UnifiedSyncService
- Added `fetchSpotifyArtistData` - Fetches artist metadata from Spotify
- Added `fetchTicketmasterEventData` - Fetches event data from Ticketmaster
- Added `fetchArtistTracks` - Fetches top tracks from Spotify for an artist

### Created API Routes
- Created `/api/spotify/artist` - Fetches and stores Spotify artist data
- Created `/api/spotify/artist/tracks` - Fetches and stores artist's top tracks
- Created `/api/ticketmaster/event` - Fetches event data and handles venue upsert

## 3. Sync Strategy Clarification

The sync strategy has been clarified:

1. **For Artist-level Sync:**
   - The Edge Function `unified-sync-v2` handles the combined sync of:
     - Spotify artist data
     - Ticketmaster shows
     - Venue data extraction and linking
   - All data is properly linked via UUIDs in the database

2. **For Show-level Sync:**
   - The Edge Function now handles syncing individual shows
   - Show sync fetches setlist suggestions from the artist's stored songs
   - Suggestions are ranked by popularity

## 4. Data Flow Summary

1. **Frontend Component** - Initiates sync request via server action or client service
2. **Server Action or Client Service** - Calls the appropriate API endpoint
3. **API Route** - Forwards request to the Edge Function with proper parameters
4. **Edge Function** - Fetches external data, processes it, and updates the database
5. **Database** - Stores synchronized data with proper foreign key relationships

## 5. Error Handling Improvements

- Added comprehensive error handling in the Edge Function
- Error statuses are properly recorded in the database
- Detailed error logs with contextual information

## 6. Consistency Guarantees

- Venue data is properly upserted using the correct constraint (`ticketmaster_id`)
- Shows are linked to artists and venues using UUIDs rather than external IDs
- Status tracking allows for resyncing failed items

## 7. Deployment and Testing

### Deployment
To deploy all the changes:

```bash
# Make the deployment script executable
chmod +x deploy_sync_v2_fixes.sh

# Run the deployment script
./deploy_sync_v2_fixes.sh
```

This script will:
1. Apply the database migration to add the necessary columns
2. Run the `pnpm updateall` command to update dependencies and build the application
3. Deploy the updated Edge Function
4. Set the required secrets for the Edge Function

### Testing
A test script has been provided to validate the sync functionality:

```bash
# Make the test script executable
chmod +x test_sync_v2.js

# Test artist sync
./test_sync_v2.js artist YOUR_ARTIST_ID

# Test show sync
./test_sync_v2.js show YOUR_SHOW_ID
```

The test script will:
1. Invoke the Edge Function directly
2. Display the response from the sync operation
3. Query the database to verify the entity's sync status and related data

## 8. Next Steps

- Monitor the system for any remaining issues
- Implement a monitoring dashboard for sync statuses
- Add scheduled background syncs for keeping data fresh 