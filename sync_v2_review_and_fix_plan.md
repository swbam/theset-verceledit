# Sync V2 Review and Fix Plan

Based on the review of the codebase, Supabase schema, Edge Functions, and comparison with `sync_v2_analysis.md` and `sync_v2_fix_implementation.md`, the following issues were identified, and a plan is proposed to address them.

## Identified Issues

1.  **Conflicting Sync Logic:**
    *   The frontend `UnifiedSyncService` calls the `unified-sync-v2` Edge Function for primary sync actions (`syncArtist`, `syncShow`, `syncVenue`).
    *   However, the service also contains separate methods (`fetchSpotifyArtistData`, `fetchTicketmasterEventData`, `fetchArtistTracks`) that call dedicated Next.js API routes (`/api/spotify/*`, `/api/ticketmaster/*`).
    *   These API routes perform their *own* database updates/upserts, creating two parallel and potentially conflicting mechanisms for syncing data and modifying the database. This contradicts the plan to use the Edge Function as the central sync engine.

2.  **Incomplete Edge Function:**
    *   The deployed `unified-sync-v2` Edge Function currently only implements logic for handling `entityType: 'artist'`.
    *   The frontend `UnifiedSyncService` attempts to call the function with `entityType: 'show'` and `entityType: 'venue'`, which will not be processed correctly by the current function code. The implementation described in `sync_v2_fix_implementation.md` for shows (including setlist suggestions) appears to be missing from the deployed function.

3.  **Inconsistent Song/Track Storage:**
    *   Spotify tracks are being stored in the `artists.stored_songs` JSONB column by both the `/api/spotify/artist/tracks/route.ts` and the `unified-sync-v2` Edge Function.
    *   Shared database utilities (`songDbUtils.ts`, used by `import-artist`) interact with the normalized `songs` table.
    *   This leads to redundancy and potential inconsistency in how song data is stored and accessed. Storing full track lists in a JSONB field on the `artists` table is generally less scalable and harder to query than using the dedicated `songs` table.

4.  **Ambiguous `saveShow` Function:**
    *   The analysis mentioned a `saveShow` function potentially located in `@/lib/api/database/shows`.
    *   Given that both the Edge Function and the `/api/ticketmaster/event` route already handle show/venue upserts, the purpose and necessity of this separate function are unclear and could introduce another point of conflicting database updates.

## Proposed Fix Plan

1.  **Consolidate Sync Logic to Edge Function:**
    *   **Confirm Strategy:** Establish the `unified-sync-v2` Edge Function as the **single point of entry** for all sync operations initiated by the frontend `UnifiedSyncService`.
    *   **Refactor API Routes:** Modify the Next.js API routes (`/api/spotify/artist`, `/api/spotify/artist/tracks`, `/api/ticketmaster/event`) to **remove their database update/upsert logic**. They can either be simplified to only fetch data (if needed elsewhere) or potentially removed entirely if `UnifiedSyncService` exclusively uses the Edge Function.
    *   **Refactor Frontend Service:** Remove the potentially redundant fetcher methods (`fetchSpotifyArtistData`, `fetchTicketmasterEventData`, `fetchArtistTracks`) from `UnifiedSyncService` if they are no longer needed after consolidating logic to the Edge Function calls (`syncArtist`, `syncShow`, `syncVenue`).

2.  **Complete Edge Function Implementation:**
    *   **Implement Show/Venue Sync:** Add the necessary logic within the `unified-sync-v2` Edge Function (`index.ts` and helper files like `api.ts`) to correctly process requests for `entityType: 'show'` and `entityType: 'venue'`. This includes:
        *   Fetching the relevant entity by its UUID (`entityId`).
        *   Fetching necessary data from external APIs (Ticketmaster, Spotify, potentially Setlist.fm).
        *   Performing the required database updates/upserts using the Supabase admin client.
        *   Implementing show-specific logic like generating `setlist_suggestions` based on related artist songs (as per `sync_v2_fix_implementation.md`).
        *   Updating the respective entity's `sync_status`, `last_sync`, and `last_sync_error` fields appropriately.

3.  **Standardize Song/Track Storage:**
    *   **Define Source of Truth:** Use the normalized `songs` table as the primary storage for all song/track details.
    *   **Update Edge Function:** Modify the `unified-sync-v2` function (specifically the Spotify sync part in `api.ts` or related utils) to save detailed track information primarily to the `songs` table, ensuring correct linking via `artist_id`. Utilize shared utilities like `saveSongToDatabase` if appropriate.
    *   **Remove Redundant Storage:** Eliminate the code that saves track lists directly into the `artists.stored_songs` JSONB column in both the `/api/spotify/artist/tracks/route.ts` (if kept) and the `unified-sync-v2` Edge Function.
    *   **(Optional) Artist Song Cache:** If a quick lookup of an artist's top songs is still needed directly on the artist record, consider creating a database view or a *derived* JSONB field (e.g., `artist_top_songs_cache`) that is updated *after* changes to the `songs` table (perhaps via a trigger or a dedicated update step in the sync function), rather than storing the raw, full list there.

4.  **Clarify/Refactor `saveShow`:**
    *   **Locate and Analyze:** Find the `saveShow` function identified in the analysis document.
    *   **Eliminate Redundancy:** Determine if its logic is duplicated by the (now consolidated) `unified-sync-v2` Edge Function. Refactor or remove the `saveShow` function to ensure show/venue data is saved exclusively through the Edge Function sync process.

5.  **Verify Environment Configuration:**
    *   **Supabase Secrets:** Double-check that `TICKETMASTER_API_KEY`, `SPOTIFY_CLIENT_ID`, and `SPOTIFY_CLIENT_SECRET` are correctly configured as **Secrets** within the Supabase project dashboard, accessible to Edge Functions via `Deno.env.get()`.
    *   **Next.js Environment:** Confirm that `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (if used by API routes/server actions), `TICKETMASTER_API_KEY`, `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET` are correctly set up in the application's environment variables (e.g., `.env.local`, Vercel environment variables) for use by the frontend service and any remaining API routes/server components. 