# TheSet - Database Integration Implementation

This document outlines the implementation of the improved database flow as requested. The main goal was to ensure proper syncing of artists, shows, venues, songs, setlists, and setlist_songs into the Supabase database.

## What Has Been Implemented

1. **Database Utility Files**
   - `src/lib/api/database.ts`: Core functions for fetching and storing artist tracks, creating setlists, and populating setlists with songs
   - `src/lib/api/database-utils.ts`: Helper functions for saving artists, venues, and shows to the database
   - `src/lib/api/database/setlists.ts`: Dedicated module for setlist operations

2. **Integration with Spotify**
   - Added proper handling of artist tracks with batch processing to avoid excessive database operations
   - Implemented track storage in the songs table with proper upsert handling to avoid duplicates

3. **Venue-based Show Syncing**
   - Enhanced the `syncVenueShows` function to fetch all shows at a venue from Ticketmaster
   - Automatically save shows and create setlists with random songs for each show

4. **Setlist Creation**
   - Implemented automatic setlist creation when shows are added
   - Each setlist is populated with 5 random songs from the artist's top tracks
   - Proper handling of cases where artist tracks aren't available, with fallback to fetching from Spotify

5. **Testing Endpoint**
   - Created `src/app/api/test-db-integration/route.ts` to test the database integration
   - Test creates an artist, venue, show, and verifies setlist creation

## Database Flow

The implemented database flow follows these steps:

1. When a venue is added to the system:
   - The venue is saved to the venues table
   - All upcoming shows at that venue are fetched from Ticketmaster
   - For each show:
     - The artist is saved to the artists table
     - The show is saved to the shows table
     - The artist's top tracks are fetched from Spotify and saved to the songs table
     - A setlist is created for the show in the setlists table
     - 5 random songs are selected and added to the setlist_songs table

2. When a show is viewed:
   - If the show doesn't have a setlist, one is created automatically
   - The setlist is populated with songs from the artist's catalog

3. When songs are needed for a setlist:
   - First check if songs exist in the database
   - If not, fetch them from Spotify and store them

## How to Test

1. Start the development server:
   ```bash
   npm run dev
   ```

2. Open the test endpoint in a browser:
   ```
   http://localhost:3000/api/test-db-integration
   ```

3. View the test results to verify:
   - Supabase connection is working
   - Artist can be saved
   - Venue can be saved
   - Show can be saved
   - Setlist is created and populated with songs

## Future Improvements

1. Add rate limiting for Ticketmaster and Spotify API calls
2. Implement caching to reduce API calls
3. Add background job processing for syncing data
4. Improve error handling and retry logic
5. Add user feedback on sync progress
