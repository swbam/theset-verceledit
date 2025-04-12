import { createServiceRoleClient } from '@/integrations/supabase/utils'; // Import the new utility
import { APIClientManager } from './api-client';
import { IncrementalSyncService } from './incremental';
import { SyncOptions, SyncResult } from './types';
import { Show } from '@/lib/types';

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
  
  constructor() {
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
      
      if (!syncStatus.needsSync) {
        // Get existing show data
        const { data: show } = await this.supabaseAdmin // Use the admin client instance
          .from('shows')
          .select('*')
          .eq('id', showId) // Assuming syncShow is called with internal UUID
          .single();
          
        return {
          success: true,
          updated: false,
          data: show as Show
        };
      }
      
      // We need to sync - fetch from APIs
      const show = await this.fetchShowData(showId);
      
      if (!show) {
        return {
          success: false,
          updated: false,
          error: 'Failed to fetch show data'
        };
      }
      
      // Update in database
      const { error } = await this.supabaseAdmin // Use the admin client instance
        .from('shows')
        .upsert(show, { onConflict: 'id' }); // Assuming 'id' is the primary key (UUID)
        
      if (error) {
        console.error(`Error upserting show ${showId}:`, error);
        return {
          success: false,
          updated: false,
          error: error.message
        };
      }
      
      // Mark as synced
      await this.syncService.markSynced(showId, 'show');
      
      return {
        success: true,
        updated: true,
        data: show
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
   * Fetch show data from all available sources
   * Combines data from Ticketmaster/setlist.fm and other sources
   */
  private async fetchShowData(showId: string): Promise<Show | null> {
    // First try to get existing show
    const { data: existingShow } = await this.supabaseAdmin // Use the admin client instance
      .from('shows')
      .select('*, venue_id, artist_id') // Select related IDs if needed
      .eq('id', showId) // Assuming showId is the internal UUID
      .single();
      
    let show = existingShow as Show | null;
    
    // Ticketmaster API for event details
    try {
      const tmData = await this.apiClient.callAPI<TmEventDetails>( // Add type assertion
        'ticketmaster',
        `events/${showId}`,
        { include: 'venues,attractions' }
      );
      
      if (tmData && tmData._embedded) { // Now TypeScript knows the shape
        // Process Ticketmaster data
        const artistId = tmData._embedded.attractions?.[0]?.id;
        const venueId = tmData._embedded.venues?.[0]?.id;
        
        show = {
          id: showId,
          name: tmData.name,
          date: tmData.dates?.start?.dateTime,
          artist_id: artistId || (show?.artist_id || null),
          venue_id: venueId || (show?.venue_id || null),
          status: tmData.dates?.status?.code || 'active',
          url: tmData.url,
          image_url: this.getBestImage(tmData.images),
          // Preserve existing fields
          ...((show && {
            created_at: show.created_at,
            updated_at: new Date().toISOString()
          }) || {
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
        };
      }
    } catch (error) {
      console.warn(`Error fetching Ticketmaster data for show ${showId}:`, error);
      // Continue with other sources
    }
    
    // Setlist.fm API for setlist info
    if (show && show.artist_id) {
      try {
        // Get artist info to search by name
        const { data: artist } = await this.supabaseAdmin // Use the admin client instance
          .from('artists')
          .select('name')
          .eq('id', show.artist_id)
          .single();
          
        if (artist) {
          // Search for setlists by artist and date
          const eventDate = new Date(show.date as string);
          const formattedDate = `${eventDate.getDate()}-${eventDate.getMonth() + 1}-${eventDate.getFullYear()}`;
          
          const setlistData = await this.apiClient.callAPI(
            'setlistfm',
            'search/setlists',
            { 
              artistName: artist.name,
              date: formattedDate,
              p: 1
            }
          ) as SetlistFmResponse | null; // Add type assertion
          
          // Update with setlist data if available
          if (setlistData?.setlist && setlistData.setlist.length > 0) { // Check shape
            const setlist = setlistData.setlist[0];
            show.setlist_id = setlist.id; // Access known property
            
            // If we got a valid setlist, initiate a setlist sync
            if (setlist.id) {
              // This would be done in a separate process
              // syncSetlist(setlist.id);
            }
          }
        }
      } catch (error) {
        console.warn(`Error fetching setlist data for show ${showId}:`, error);
      }
    }
    
    return show;
  }
  
  /**
   * Get the best quality image from an array of images
   */
  private getBestImage(images?: Array<{url: string, width: number, height: number}>): string | null {
    if (!images || images.length === 0) return null;
    
    // Sort by width to get highest resolution
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
      const result = await this.syncShow(showId, options);
      
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
        params.genreId = genreId;
      }
      
      if (startDate) {
        params.startDateTime = startDate;
      } else {
        // Default to today
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
      ) as TmEventSearchResponse | null; // Add type assertion
      
      if (!response?._embedded?.events) { // Now TypeScript knows the shape
        return [];
      }
      
      // Process shows and store them
      const shows: Show[] = [];
      
      for (const event of response._embedded.events) {
        if (!event.id) continue;
        
        const artistId = event._embedded?.attractions?.[0]?.id;
        const venueId = event._embedded?.venues?.[0]?.id;
        
        // Check if we need to create artist/venue first
        if (artistId) {
          // This would queue artist sync in a real implementation
          // await this.syncArtist(artistId);
        }
        
        if (venueId) {
          // This would queue venue sync in a real implementation
          // await this.syncVenue(venueId);
        }
        
        const show: Show = {
          id: event.id,
          name: event.name,
          date: event.dates?.start?.dateTime,
          artist_id: artistId || null,
          venue_id: venueId || null,
          status: event.dates?.status?.code || 'active',
          url: event.url,
          image_url: this.getBestImage(event.images),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        shows.push(show);
        
        // Upsert show to database
        await this.supabaseAdmin // Use the admin client instance
          .from('shows')
          .upsert(show, { onConflict: 'id' }); // Assuming 'id' is the primary key (UUID)
          
        // Mark as synced
        await this.syncService.markSynced(event.id, 'show');
      }
      
      return shows;
    } catch (error) {
      console.error('Error searching upcoming shows:', error);
      return [];
    }
  }
}
