# Setlist Voting App Sync System Revamp Plan

## Problem Statement

The current sync system for importing artist and show data from Ticketmaster and Spotify into the Supabase database has mapping issues. This results in incorrect data display on artist and show pages, particularly concerning upcoming shows and setlists. The core `unified-sync` function and associated database mappings require a thorough review and potential overhaul.

## Objectives

1.  Correctly map data from Ticketmaster and Spotify APIs to Supabase tables (`artists`, `shows`, `setlists`, etc.).
2.  Ensure accurate population of artist's upcoming shows.
3.  Implement reliable sync for Spotify track data into `artists.stored_tracks`.
4.  Establish correct relationships between `shows` and `setlists`.
5.  Verify and fix client-side data fetching and display for artists and shows.
6.  Ensure correct usage of environment variables (client vs. server prefixes).

## Diagnostic & Implementation Steps

1.  **Analyze Core Sync Logic (`unified-sync/index.ts`):**
    *   Review how data from Ticketmaster (events) and Spotify (tracks) is processed.
    *   Verify the mapping logic between API response fields and Supabase table columns. Pay close attention to `artists`, `shows`, and related tables.
    *   Check error handling and logging within the sync function.

2.  **Inspect Database Schemas:**
    *   Use MCP tools (`get_table_schema`) to review the structure of `artists`, `shows`, `venues`, and `setlists` tables.
    *   Verify foreign key relationships (e.g., `shows.artist_id`, `setlists.show_id`).
    *   Ensure data types are appropriate for the incoming API data.
    *   Specifically check the `artists.stored_tracks` JSONB structure and population logic.

3.  **Review Client-Side Data Fetching:**
    *   Examine components responsible for displaying artist and show details (e.g., `src/pages/ArtistDetail.tsx`, `src/pages/ShowDetail.tsx`, `src/hooks/use-artist-detail.ts`, `src/hooks/use-show-detail.ts`).
    *   Verify how data is fetched from Supabase (queries, function calls).
    *   Ensure correct fields are being requested and displayed.

4.  **Validate Supabase RLS Policies:**
    *   Check Row Level Security policies on relevant tables (`artists`, `shows`, `setlists`, `votes`).
    *   Ensure policies allow necessary read/write access for both server-side functions and client-side operations.

5.  **Verify Environment Variables & Secrets:**
    *   Confirm correct usage of client-side (`NEXT_PUBLIC_`) and server-side prefixes for Supabase URL, anon key, and service role key.
    *   Check Supabase secret management for API keys (Ticketmaster, Spotify, Setlist.fm).

6.  **Test `pnpm updateall` Script:**
    *   Review the script's steps (DB migrations, building, etc.).
    *   Ensure it correctly applies migrations and updates functions.

7.  **Implement & Test Fixes:**
    *   Modify `unified-sync/index.ts` and potentially other sync-related functions (`sync-artist`, `sync-show`, `spotify-sync`) based on findings.
    *   Update database schemas via migrations if necessary (using Supabase MCP `execute_postgresql`).
    *   Adjust client-side code as needed.
    *   Test the sync process thoroughly by importing new artists/shows.
    *   Verify data accuracy on the frontend.

## Data Flow Overview

```mermaid
graph TD
    A[Ticketmaster API] -->|Event Data| B(Sync Service - unified-sync)
    F[Spotify API] -->|Track/Artist Data| B
    B -->|Processed Artist/Show Data| C[(Supabase DB - artists, shows)]
    B -->|Processed Track Data| C[(Supabase DB - artists.stored_tracks)]
    C --> D[Client App - Artist/Show Pages]
    B -.-> E[Error Logs]
    D -->|User Interactions (Votes)| C[(Supabase DB - votes)]
```

## Key Files/Areas for Review

*   **Sync Functions:** `supabase/functions/unified-sync/index.ts`, `supabase/functions/sync-artist/index.ts`, `supabase/functions/sync-show/index.ts`, `supabase/functions/spotify-sync/index.ts`
*   **Database Schema:** `artists`, `shows`, `venues`, `setlists` tables (Inspect via MCP)
*   **Client Components/Hooks:** `src/pages/ArtistDetail.tsx`, `src/pages/ShowDetail.tsx`, `src/hooks/use-artist-detail.ts`, `src/hooks/use-show-detail.ts`
*   **Supabase Config:** RLS Policies, Environment Variables, Secrets
*   **Utility Script:** `pnpm updateall` (Review its definition in `package.json`)
