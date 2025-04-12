import { createServiceRoleClient } from '@/integrations/supabase/utils'; // Import the new utility
import { APIClientManager } from './api-client';
import { IncrementalSyncService } from './incremental';
import { SyncOptions, SyncResult, SetlistData, SyncTask } from './types'; // Import SyncTask
import { Show, Song } from '@/lib/types';
import { SyncManager } from './manager'; // Import SyncManager

// --- Interfaces for Setlist.fm API Responses ---
interface SetlistFmSong {
  name: string;
  // Add other relevant fields if needed
}

interface SetlistFmSet {
  encore?: number;
  song?: SetlistFmSong[];
}

interface SetlistFmArtist {
  mbid?: string; // MusicBrainz ID
  name?: string;
  // Add other relevant fields if needed
}

interface SetlistFmSetlistDetails {
  id: string;
  artist?: SetlistFmArtist;
  eventDate?: string; // Format: DD-MM-YYYY
  sets?: {
    set?: SetlistFmSet[];
  };
  // Add other relevant fields if needed
}

interface SetlistFmSearchResponse {
  setlist?: SetlistFmSetlistDetails[];
  // Add other potential response fields like total, page, itemsPerPage
}
// --- End Interfaces ---


/**
 * Service for syncing setlist data from setlist.fm
 */
export class SetlistSyncService {
  private apiClient: APIClientManager;
  private syncService: IncrementalSyncService;
  private supabaseAdmin;
  private manager: SyncManager; // Add manager property
  
  // Modify constructor to accept SyncManager
  constructor(manager: SyncManager) { 
    this.manager = manager; // Store the manager instance
    this.apiClient = new APIClientManager();
    this.syncService = new IncrementalSyncService();
    this.supabaseAdmin = createServiceRoleClient(); 
  }
  
  /**
   * Sync a setlist by ID
   */
  async syncSetlist(setlistId: string, options?: SyncOptions): Promise<SyncResult<SetlistData>> {
    try {
      // Check if we need to sync
      const syncStatus = await this.syncService.getSyncStatus(setlistId, 'setlist', options);
      
      if (!syncStatus.needsSync) {
        // Get existing setlist data
        const { data: setlist } = await this.supabaseAdmin // Use the admin client instance
          .from('setlists')
          .select('*')
          .eq('id', setlistId)
          .single();
          
        return {
          success: true,
          updated: false,
          data: setlist as SetlistData
        };
      }
      
      // We need to sync - fetch from API
      const setlist = await this.fetchSetlistData(setlistId);
      
      if (!setlist) {
        return {
          success: false,
          updated: false,
          error: 'Failed to fetch setlist data'
        };
      }
      
      // Update in database
      const { error } = await this.supabaseAdmin // Use the admin client instance
        .from('setlists')
        .upsert(
          {
            id: setlistId,
            artist_id: setlist.artistId,
            show_id: setlist.showId,
            songs: setlist.songs || [],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }, 
          { onConflict: 'id' }
        );
        
      if (error) {
        console.error(`Error upserting setlist ${setlistId}:`, error);
        return {
          success: false,
          updated: false,
          error: error.message
        };
      }
      
      // Update the show to link it to this setlist
      if (setlist.showId) {
        await this.supabaseAdmin // Use the admin client instance
          .from('shows')
          .update({ setlist_id: setlistId })
          .eq('id', setlist.showId);
      }
      
      // Mark as synced
      await this.syncService.markSynced(setlistId, 'setlist');
      
      return {
        success: true,
        updated: true,
        data: setlist
      };
    } catch (error) {
      console.error(`Error syncing setlist ${setlistId}:`, error);
      return {
        success: false,
        updated: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
  
  /**
   * Fetch setlist data from setlist.fm
   */
  private async fetchSetlistData(setlistId: string): Promise<SetlistData | null> {
    try {
      const setlistData = await this.apiClient.callAPI<SetlistFmSetlistDetails>( // Add type assertion
        'setlistfm',
        `setlists/${setlistId}`,
        {}
      );
      
      if (!setlistData) { // Now TypeScript knows the shape
        return null;
      }
      
      // Extract songs from setlist
      const songs: Song[] = [];
      
      if (setlistData.sets?.set) { // Use optional chaining
        setlistData.sets.set.forEach((set, setIndex) => {
          if (set.song) {
            set.song.forEach((song, songIndex) => {
              if (song.name) {
                const songId = `${setlistId}-${setIndex}-${songIndex}`; // Create a unique ID for the song within this setlist context
                // Define the song object, ensuring all required fields are present
                const newSongData: Song = { 
                  id: songId, 
                  // external_id is optional, omit if not available
                  name: song.name,
                  artist_id: null, 
                  artist_external_id: (setlistData.artist?.mbid ?? null) as (string | null), 
                  spotify_id: null, 
                  spotify_url: null, 
                  preview_url: null, 
                  duration_ms: null, 
                  popularity: null, 
                  album_name: null, 
                  album_image: null, 
                  encore: set.encore ? 1 : 0, 
                  position: songIndex + 1, 
                  // Assign dates last
                  created_at: new Date().toISOString(), 
                  updated_at: new Date().toISOString() 
                };
                songs.push(newSongData); // Push the fully typed object
              }
            });
          }
        });
      }
      
      // Look up related show based on artist and date
      let showId = null;
      if (setlistData.artist?.mbid && setlistData.eventDate) { // Check if artist MBID and date exist
        // Get the artist ID (MusicBrainz ID from setlist.fm)
        const artistMbid = setlistData.artist.mbid;
        
        // Parse date from eventDate (DD-MM-YYYY format)
        const dateParts = setlistData.eventDate.split('-');
        if (dateParts.length === 3) {
          const date = new Date( // Create Date object
            parseInt(dateParts[2]), // Year
            parseInt(dateParts[1]) - 1, // Month (0-based)
            parseInt(dateParts[0]) // Day
          );
          
          // Find the internal artist UUID using the MBID
          const { data: artistData } = await this.supabaseAdmin
            .from('artists')
            .select('id')
            .eq('external_id', artistMbid) // Assuming external_id stores MBID for artists synced via setlist.fm
            .single();
            
          let shows: { id: string }[] | null = null; // Declare shows variable outside the block

          if (artistData?.id) {
            const internalArtistId = artistData.id;
            // Search for shows by internal artist ID and date
            const { data } = await this.supabaseAdmin // Use the admin client instance
              .from('shows')
              .select('id')
              .eq('artist_id', internalArtistId) // Use internal UUID
              .gte('date', new Date(date.setHours(0, 0, 0, 0)).toISOString())
              .lt('date', new Date(date.setHours(23, 59, 59, 999)).toISOString());
            
            shows = data; // Assign the result to the outer variable
              
            if (shows && shows.length > 0) {
              showId = shows[0].id;
            }
          } else {
             console.warn(`Could not find internal artist ID for MBID: ${artistMbid}`);
          }
          // This check is now redundant as it's handled inside the if(artistData?.id) block
          // if (shows && shows.length > 0) { 
          //   showId = shows[0].id;
          // }
        }
      }
      
      return {
        showId: showId || '', // Return found show ID or empty string
        artistId: setlistData.artist?.mbid || '', // Return artist MBID
        songs: songs
      };
    } catch (error) {
      console.error(`Error fetching setlist ${setlistId} from API:`, error);
      return null;
    }
  }
  
  /**
   * Find and sync a setlist for a show
   */
  async findSetlistForShow(showId: string, artistId?: string | null): Promise<boolean> {
    try {
      if (!artistId) {
        // Get the artist ID from the show
        const { data: show } = await this.supabaseAdmin // Use the admin client instance
          .from('shows')
          .select('artist_id, date')
          .eq('id', showId)
          .single();
          
        if (!show || !show.artist_id || !show.date) {
          console.error(`Unable to find setlist for show ${showId}: missing artist or date`);
          return false;
        }
        
        artistId = show.artist_id;
      }
      
      // Get artist details
      const { data: artist } = await this.supabaseAdmin // Use the admin client instance
        .from('artists')
        .select('name')
        .eq('id', artistId)
        .single();
        
      if (!artist) {
        console.error(`Unable to find setlist for show ${showId}: artist not found`);
        return false;
      }
      
      // Get show date
      const { data: show } = await this.supabaseAdmin // Use the admin client instance
        .from('shows')
        .select('date')
        .eq('id', showId)
        .single();
        
      if (!show || !show.date) {
        console.error(`Unable to find setlist for show ${showId}: no date`);
        return false;
      }
      
      // Format date for setlist.fm (DD-MM-YYYY)
      const date = new Date(show.date);
      const formattedDate = `${date.getDate()}-${date.getMonth() + 1}-${date.getFullYear()}`;
      
      // Search for setlists
      const setlistData = await this.apiClient.callAPI(
        'setlistfm',
        'search/setlists',
        { 
          artistName: artist.name,
          date: formattedDate,
          p: 1
        }
      ) as SetlistFmSearchResponse | null; // Add type assertion
      
      if (setlistData?.setlist && setlistData.setlist.length > 0) { // Check shape
        const setlist = setlistData.setlist[0];
        
        // Update show with setlist ID
        await this.supabaseAdmin // Use the admin client instance
          .from('shows')
          .update({ setlist_id: setlist.id })
          .eq('id', showId);
          
        // Sync the setlist
        await this.syncSetlist(setlist.id, { force: true });
        return true;
      }
      
      return false;
    } catch (error) {
      console.error(`Error finding setlist for show ${showId}:`, error);
      return false;
    }
  }
  
  /**
   * Get recent setlists for an artist - fetches basic info and queues full sync.
   * Returns basic info immediately for the API response.
   */
  async getArtistSetlists(artistId: string, limit = 10): Promise<Partial<SetlistFmSetlistDetails>[]> { // Return partial basic info
    try {
      // Get artist info
      const { data: artist } = await this.supabaseAdmin
        .from('artists')
        .select('name')
        .eq('id', artistId)
        .single();
        
      if (!artist) {
        console.error(`Artist ${artistId} not found for setlists`);
        return [];
      }
      
      // Search for recent setlists
      const response = await this.apiClient.callAPI(
        'setlistfm',
        'search/setlists',
        {
          artistName: artist.name,
          p: 1,
          sort: 'date'
        }
      ) as SetlistFmSearchResponse | null; // Add type assertion
      
      if (!response?.setlist) { // Check shape
        return [];
      }
      
      const results: Partial<SetlistFmSetlistDetails>[] = []; // Store basic info to return
      const processedIds: Set<string> = new Set();
      
      // Process each setlist (up to limit)
      for (const setlist of response.setlist) { 
        if (results.length >= limit) break;
        if (!setlist.id || processedIds.has(setlist.id)) continue; 
        
        processedIds.add(setlist.id);

        // Add basic info needed for the API response
        results.push({
          id: setlist.id,
          eventDate: setlist.eventDate,
          // Add venue/city if needed from setlist object for response
          // venue: setlist.venue?.name, 
          // city: setlist.venue?.city?.name,
        });
        
        // Enqueue the full sync task instead of doing it directly
        // Use the manager instance passed in the constructor
        await this.manager.enqueueTask({ 
          type: 'setlist',
          id: setlist.id,
          priority: 'medium', // Adjust priority as needed
          operation: 'refresh' // Refresh the setlist data
        });
      }
      
      return results; // Return the array of basic setlist info
    } catch (error) {
      console.error(`Error getting recent setlists for artist ${artistId}:`, error);
      return [];
    }
  }
}
