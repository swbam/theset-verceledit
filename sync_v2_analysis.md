# V2 Sync API Analysis and Plan

This document outlines the findings from reviewing the v2 data synchronization process and proposes a plan to address the identified issues.

## Analysis Findings

1.  **Incorrect Venue Upsert in Edge Function:**
    *   The `unified-sync-v2` Edge Function (`supabase/functions/unified-sync-v2/index.ts`) used `tm_venue_id` in the `onConflict` clause for the `venues` table upsert.
    *   The correct unique constraint name based on `schema.sql` is `ticketmaster_id`.
    *   The upsert data mapping was also incorrect, spreading the API response object instead of mapping fields like `tm_venue_id` to `ticketmaster_id`.
    *   **Status:** This has been corrected in `supabase/functions/unified-sync-v2/index.ts`.

2.  **Incomplete Frontend Sync Service:**
    *   The `UnifiedSyncService` in `src/lib/sync/unified-sync.ts` contains placeholder implementations for:
        *   `fetchSpotifyArtistData`
        *   `fetchTicketmasterEventData`
        *   `fetchArtistTracks`
    *   These methods need to be implemented to fetch data from the respective APIs (likely via API routes or other Edge Functions).

3.  **Sync Strategy Ambiguity:**
    *   The frontend `syncArtist` method currently only handles Spotify sync via the unimplemented `fetchSpotifyArtistData`.
    *   The frontend `syncShow` method handles Ticketmaster sync via the unimplemented `fetchTicketmasterEventData` and a separate `saveShow` function.
    *   It's unclear how or if the frontend service is intended to interact with the `unified-sync-v2` Edge Function, which handles the combined Artist -> Shows (Ticketmaster) + Artist (Spotify) sync.

4.  **Dependency on `saveShow`:**
    *   The frontend `syncShow` relies on `saveShow` from `@/lib/api/database/shows`. The implementation of `saveShow` needs review to ensure it aligns with the database schema and handles updates correctly.

## Proposed Plan

1.  **Verify Edge Function Fix:**
    *   Deploy and test the updated `unified-sync-v2` Edge Function to confirm that venues are correctly upserted and linked to shows using the `ticketmaster_id`.

2.  **Define and Implement Sync Strategy:**
    *   **Decision:** Determine the primary mechanism for syncing data. Recommendation: Use the `unified-sync-v2` Edge Function as the main engine for artist-level syncs (Ticketmaster shows + Spotify details) triggered server-side or via specific user actions.
    *   **Frontend Service Role:** Refine the `UnifiedSyncService` (`src/lib/sync/unified-sync.ts`) for potential client-side needs, possibly invoking the Edge Function or handling smaller, specific updates.
    *   **Implement Fetchers:** Implement the placeholder methods (`fetchSpotifyArtistData`, `fetchTicketmasterEventData`, `fetchArtistTracks`) potentially by creating dedicated API routes or Edge Functions for each service if not using the unified one.

3.  **Review `saveShow` Function:**
    *   Examine the code in `@/lib/api/database/shows.ts` (assuming path) for the `saveShow` function. Ensure it correctly maps data to the `shows` table schema and handles potential conflicts or updates appropriately.

4.  **Environment Variables & Secrets:**
    *   Verify that `TICKETMASTER_API_KEY`, `SPOTIFY_CLIENT_ID`, and `SPOTIFY_CLIENT_SECRET` are correctly configured as Supabase secrets and accessed using `Deno.env.get()` in the Edge Function.
    *   Confirm configuration for any keys needed by the frontend service implementations (e.g., Setlist.fm API key).

5.  **Error Handling and Logging:**
    *   Enhance error handling within the `unified-sync-v2` Edge Function to provide more specific error messages and update the `sync_status` and `last_sync_error` fields reliably.
    *   Improve logging in both the Edge Function and frontend service for better debugging.

6.  **Testing:**
    *   Develop tests for the `unified-sync-v2` Edge Function.
    *   Develop tests for the frontend `UnifiedSyncService` methods once implemented.