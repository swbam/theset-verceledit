import { createServiceRoleClient } from '@/integrations/supabase/utils'; // Import the new utility
import { APIClientManager } from './api-client';
import { IncrementalSyncService } from './incremental';
import { SyncOptions, SyncResult } from './types';
import { Show, Song } from '@/lib/types'; // Import Song type
import { SyncManager } from './manager'; // Import SyncManager type
import { getArtistTopTracks } from '@/lib/spotify/top-tracks'; // Assuming this exists and works

// --- Interfaces for API Responses ---
interface TmImage {
  url: string;
  width: number;
  height: number;
}

interface TmEventDetails {
  id: string;
  name: string;
  url?: string;
  images?: TmImage[];
  dates?: { start?: { dateTime?: string }; status?: { code?: string } };
  _embedded?: {
    attractions?: [{ id: string }]; // Simplified
    venues?: [{ id: string }]; // Simplified
  };
}

interface SetlistFmSetlist {
  id: string;
  // Add other relevant fields if needed
}

interface SetlistFmResponse {
  setlist?: SetlistFmSetlist[];
  // Add other potential response fields
}

interface TmEventSearchResponse {
   _embedded?: {
     events?: TmEventDetails[];
   };
}
// --- End Interfaces ---

/**
 * Service for syncing shows data from external APIs
 */
export class ShowSyncService {
  private apiClient: APIClientManager;
  private syncService: IncrementalSyncService;
  private supabaseAdmin; // Add a property for the client instance
  private syncManager: SyncManager; // Property to hold SyncManager instance

  constructor(syncManager: SyncManager) { // Accept SyncManager instance
    this.syncManager = syncManager; // Store the instance
    this.apiClient = new APIClientManager();
    this.syncService = new IncrementalSyncService();
    this.supabaseAdmin = createServiceRoleClient(); // Instantiate the service role client
  }

  /**
   * Sync a show by ID
   */
  async syncShow(showId: string, options?: SyncOptions): Promise<SyncResult<Show>> {
    try {
      // Check if we need to sync
      const syncStatus = await this.syncService.getSyncStatus(showId, 'show', options);

      if (!syncStatus.needsSync && !options?.force) { // Added force check
        // Get existing show data
        const { data: show, error: fetchError } = await this.supabaseAdmin
          .from('shows')
          .select('*')
          .eq('id', showId) // Assuming syncShow is called with external ID now
          .maybeSingle(); // Use maybeSingle

        if (fetchError) {
           console.warn(`Error fetching existing show ${showId} during sync check: ${fetchError.message}`);
           // Proceed to fetch from API if DB check fails
        } else if (show) {
           return {
             success: true,
             updated: false,
             data: show as Show
           };
        }
      }

      // We need to sync - fetch from APIs
      const fetchedShowData = await this.fetchShowData(showId); // Use external ID

      if (!fetchedShowData) {
        return {
          success: false,
          updated: false,
          error: 'Failed to fetch show data from external APIs'
        };
      }

      // Update in database
      // Use external ID as the primary key for upsert if that's the schema design
      // Or fetch internal ID first if necessary
      const { error } = await this.supabaseAdmin
        .from('shows')
        .upsert(fetchedShowData, { onConflict: 'id' }); // Adjust onConflict if needed (e.g., 'external_id')

      if (error) {
        console.error(`Error upserting show ${showId}:`, error);
        return {
          success: false,
          updated: false,
          error: error.message
        };
      }

      // Mark as synced using the ID used for upsert (external ID in this case)
      await this.syncService.markSynced(showId, 'show');

      // --- Create Initial Voting Setlist ---
      // --- Create Initial Voting Setlist ---
      // Check if it's a new show (no last sync time) or forced update
      if (fetchedShowData.artist_id && (options?.force || !syncStatus.lastSynced)) {
         console.log(`Attempting to create initial voting setlist for show ${showId}`);
         await this._createInitialVotingSetlist(showId, fetchedShowData.artist_id);
      }
      // ------------------------------------

      return {
        success: true,
        updated: true,
        data: fetchedShowData // Return the data that was upserted
      };
    } catch (error) {
      console.error(`Error syncing show ${showId}:`, error);
      return {
        success: false,
        updated: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Fetch show data from all available sources using external ID
   */
  private async fetchShowData(externalShowId: string): Promise<Show | null> {
    let showData: Partial<Show> = { id: externalShowId }; // Start with external ID

    // Ticketmaster API for event details
    try {
      const tmData = await this.apiClient.callAPI<TmEventDetails>(
        'ticketmaster',
        `events/${externalShowId}`,
        { /* include: 'venues,attractions' - Might not be needed if we sync separately */ }
      );

      if (tmData) {
        const artistId = tmData._embedded?.attractions?.[0]?.id || null;
        const venueId = tmData._embedded?.venues?.[0]?.id || null;

        // Basic show data from Ticketmaster
        showData = {
          ...showData,
          id: tmData.id, // Confirm using TM ID as primary or external key
          name: tmData.name,
          date: tmData.dates?.start?.dateTime || null,
          artist_id: artistId, // Store external IDs for now
          venue_id: venueId,   // Store external IDs for now
          status: tmData.dates?.status?.code || 'active',
          url: tmData.url,
          image_url: this.getBestImage(tmData.images),
          updated_at: new Date().toISOString()
          // created_at will be set by DB on first insert
        };

        // Queue dependent syncs (non-blocking)
        if (artistId) {
           this.syncManager.enqueueTask({ type: 'artist', id: artistId, operation: 'create', priority: 'medium' }).catch(e => console.error("Failed to queue artist sync", e));
        }
        if (venueId) {
           this.syncManager.enqueueTask({ type: 'venue', id: venueId, operation: 'create', priority: 'medium' }).catch(e => console.error("Failed to queue venue sync", e));
        }

      }
    } catch (error) {
      console.warn(`Error fetching Ticketmaster data for show ${externalShowId}:`, error);
      // If TM fails, we might not have enough data to proceed
      return null;
    }

    // Setlist.fm API for setlist info (requires artist and date)
    if (showData.artist_id && showData.date) {
      try {
        // Need artist name for setlist.fm search - requires fetching artist data first
        // This highlights complexity - maybe setlist sync should be separate task?
        // For now, skip setlist.fm lookup here, handle via separate setlist sync task if needed.
        console.log(`Skipping setlist.fm lookup during show fetch for ${externalShowId}. Handle via separate task.`);
        // showData.setlist_fm_id = ...
      } catch (error) {
        console.warn(`Error fetching setlist data for show ${externalShowId}:`, error);
      }
    }

    // Ensure all required fields for the 'Show' type are present
    // Add defaults if necessary, although upsert might handle some.
    showData.created_at = showData.created_at || new Date().toISOString(); // Ensure created_at exists

    return showData as Show; // Cast to Show, assuming required fields are met
  }


  /**
   * Creates the initial 'setlists' record for a show and potentially
   * ensures some top songs exist in the 'songs' table for voting.
   * (Adapted from database/setlists.ts logic)
   */
  private async _createInitialVotingSetlist(showId: string, artistId: string): Promise<string | null> {
    try {
      console.log(`[_createInitialVotingSetlist] Creating setlist for show ${showId}`);

      // Check if setlist already exists
      const { data: existingSetlist, error: checkError } = await this.supabaseAdmin
        .from('setlists')
        .select('id')
        .eq('show_id', showId)
        .maybeSingle();

      if (checkError) {
        console.error("[_createInitialVotingSetlist] Error checking for existing setlist:", checkError);
        return null;
      }
      if (existingSetlist) {
        console.log(`[_createInitialVotingSetlist] Setlist already exists for show ${showId}: ${existingSetlist.id}`);
        return existingSetlist.id;
      }

      // Get show details needed for setlist record
      const { data: show, error: showError } = await this.supabaseAdmin
        .from('shows')
        .select('date, venue_id, venues(name, city)') // Fetch joined venue data
        .eq('id', showId) // Use the external show ID passed in
        .maybeSingle(); // Use maybeSingle as show might not be fully synced yet?

      if (showError || !show) {
        console.error("[_createInitialVotingSetlist] Error getting show details:", showError);
        return null;
      }

      // Create new setlist record
      const { data: newSetlist, error: createError } = await this.supabaseAdmin
        .from('setlists')
        .insert({
          artist_id: artistId, // Use the artist ID passed in
          show_id: showId,     // Use the show ID passed in
          date: show.date,
          venue: show.venues?.name || null,
          venue_city: show.venues?.city || null,
          // setlist_fm_id: null, // Ensure this is null for voting setlists
        })
        .select('id') // Select only the ID
        .single();

      if (createError || !newSetlist) {
        console.error("[_createInitialVotingSetlist] Error creating setlist record:", createError);
        return null;
      }
      console.log(`[_createInitialVotingSetlist] Created setlist record ${newSetlist.id} for show ${showId}`);

      // --- Ensure Top Songs Exist (Optional Pre-population) ---
      // This part ensures some songs are in the 'songs' table,
      // but doesn't link them directly to the setlist via a join table anymore.
      try {
         console.log(`[_createInitialVotingSetlist] Ensuring top songs exist for artist ${artistId}`);
         // Get artist's Spotify ID
         const { data: artist, error: artistError } = await this.supabaseAdmin
           .from('artists')
           .select('spotify_id')
           .eq('id', artistId) // Use internal artist ID
           .maybeSingle();

         if (artistError || !artist?.spotify_id) {
           console.error("[_createInitialVotingSetlist] Cannot find Spotify ID for artist:", artistId, artistError);
         } else {
           // Fetch top tracks from Spotify
           const topTracksResponse = await getArtistTopTracks(artist.spotify_id); // Assumes this function exists and works
           const topTracks = topTracksResponse?.tracks || []; // Access the tracks array

           if (topTracks.length > 0) {
             const songsToUpsert = topTracks.slice(0, 10).map(track => ({ // Limit to e.g., top 10
               name: track.name,
               artist_id: artistId, // Link to internal artist ID
               spotify_id: track.id, // Use Spotify ID as conflict target
               duration_ms: track.duration_ms,
               popularity: track.popularity || 0,
               preview_url: track.preview_url,
               album_name: track.album || null, // Assign album string directly
               album_image_url: null // Cannot get image from track.album string
             }));

             // Upsert these songs into the main 'songs' table
             const { error: songUpsertError } = await this.supabaseAdmin
               .from('songs')
               .upsert(songsToUpsert, { onConflict: 'spotify_id' }); // Upsert based on Spotify ID

             if (songUpsertError) {
               console.error("[_createInitialVotingSetlist] Error upserting top songs:", songUpsertError);
             } else {
                console.log(`[_createInitialVotingSetlist] Upserted ${songsToUpsert.length} top songs for artist ${artistId}`);
             }
           } else {
              console.log(`[_createInitialVotingSetlist] No top tracks found on Spotify for artist ${artistId}`);
           }
         }
      } catch (songError) {
         console.error("[_createInitialVotingSetlist] Error ensuring top songs exist:", songError);
      }
      // --- End Ensure Top Songs ---

      return newSetlist.id; // Return the ID of the created setlist record

    } catch (error) {
      console.error("[_createInitialVotingSetlist] Error:", error);
      return null;
    }
  }
  //   // - Check if setlist exists for showId
  //   // - If not, insert into 'setlists' table
  //   // - Fetch artist top tracks (maybe call song-service?)
  //   // - Upsert tracks into 'songs' table
  // }


  /**
   * Get the best quality image from an array of images
   */
  private getBestImage(images?: Array<{url: string, width: number, height: number}>): string | null {
    if (!images || images.length === 0) return null;
    const sorted = [...images].sort((a, b) => (b.width || 0) - (a.width || 0));
    return sorted[0].url;
  }

  /**
   * Sync multiple shows by their IDs
   */
  async syncMultipleShows(showIds: string[], options?: SyncOptions): Promise<SyncResult<Show[]>> {
    const results: Show[] = [];
    const errors: string[] = [];
    let hasUpdates = false;

    for (const showId of showIds) {
      const result = await this.syncShow(showId, options); // Uses external ID now

      if (result.success && result.data) {
        results.push(result.data);
        if (result.updated) {
          hasUpdates = true;
        }
      } else if (result.error) {
        errors.push(`Show ${showId}: ${result.error}`);
      }
    }

    return {
      success: errors.length === 0,
      updated: hasUpdates,
      data: results,
      error: errors.length > 0 ? errors.join('; ') : undefined
    };
  }

  /**
   * Search for upcoming shows by location and genre
   */
  async searchUpcomingShows(
    city?: string,
    stateCode?: string,
    genreId?: string,
    startDate?: string,
    endDate?: string,
    radius?: number
  ): Promise<Show[]> {
    try {
      const params: Record<string, any> = {
        size: 50,
        sort: 'date,asc'
      };

      if (city && stateCode) {
        params.city = city;
        params.stateCode = stateCode;
      }

      if (genreId) {
        params.classificationId = genreId; // Use classificationId for TM genre search
      }

      if (startDate) {
        params.startDateTime = startDate;
      } else {
        const today = new Date();
        params.startDateTime = today.toISOString().split('T')[0] + 'T00:00:00Z';
      }

      if (endDate) {
        params.endDateTime = endDate;
      }

      if (radius) {
        params.radius = radius;
        params.unit = 'miles';
      }

      const response = await this.apiClient.callAPI(
        'ticketmaster',
        'events',
        params
      ) as TmEventSearchResponse | null;

      if (!response?._embedded?.events) {
        return [];
      }

      // Process shows and queue sync tasks
      const shows: Show[] = [];

      for (const event of response._embedded.events) {
        if (!event.id) continue;

        const artistId = event._embedded?.attractions?.[0]?.id || null;
        const venueId = event._embedded?.venues?.[0]?.id || null;

        // Construct show data based on API response for immediate return
        const show: Show = {
          id: event.id, // Assuming external ID is used
          name: event.name,
          date: event.dates?.start?.dateTime || null,
          artist_id: artistId,
          venue_id: venueId,
          status: event.dates?.status?.code || 'active',
          url: event.url,
          image_url: this.getBestImage(event.images),
          created_at: new Date().toISOString(), // Placeholder, DB handles this
          updated_at: new Date().toISOString()  // Placeholder, DB handles this
          // Add other fields from Show type if needed, ensure they allow null/undefined
        };

        shows.push(show); // Add API data to the list to be returned

        // Queue sync task instead of direct upsert
        await this.syncManager.enqueueTask({ // Use this.syncManager
            type: 'show',
            id: event.id, // Use external ID
            operation: 'create',
            priority: 'low', // Lower priority for general search results
            payload: { artist_external_id: artistId, venue_external_id: venueId } // Pass related IDs
        });
        // SyncManager will handle upsert and marking as synced via its queue processing

      } // End of for loop

      return shows; // Return data fetched from API
    } catch (error) {
      console.error('Error searching upcoming shows:', error);
      return [];
    }
  }
}
