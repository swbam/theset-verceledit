import { supabase } from '@/integrations/supabase/client';
import { APIClientManager } from './api-client';
import { IncrementalSyncService } from './incremental';
import { SyncOptions, SyncResult } from './types';
import { Venue, Show } from '@/lib/types';

/**
 * Service for syncing venue data from external APIs
 */
export class VenueSyncService {
  private apiClient: APIClientManager;
  private syncService: IncrementalSyncService;
  
  constructor() {
    this.apiClient = new APIClientManager();
    this.syncService = new IncrementalSyncService();
  }
  
  /**
   * Sync a venue by ID
   */
  async syncVenue(venueId: string, options?: SyncOptions): Promise<SyncResult<Venue>> {
    try {
      // Check if we need to sync
      const syncStatus = await this.syncService.getSyncStatus(venueId, 'venue', options);
      
      if (!syncStatus.needsSync) {
        // Get existing venue data
        const { data: venue, error: fetchError } = await supabase
          .from('venues')
          .select('*')
          .eq('external_id', venueId)
          .single();
          
        if (fetchError || !venue) {
          console.error(`Error fetching existing venue ${venueId}:`, fetchError);
          return {
            success: false,
            updated: false,
            error: fetchError?.message || 'Venue not found'
          };
        }
        
        return {
          success: true,
          updated: false,
          data: venue as Venue
        };
      }
      
      // We need to sync - fetch from APIs
      const venue = await this.fetchVenueData(venueId);
      
      if (!venue) {
        return {
          success: false,
          updated: false,
          error: 'Failed to fetch venue data'
        };
      }
      
      // Ensure we have an external_id for tracking purposes
      venue.external_id = venueId;
      
      // Update in database
      console.log(`Upserting venue data for ID ${venueId}:`, venue);
      const { error } = await supabase
        .from('venues')
        .upsert(venue, { 
          onConflict: 'external_id',
          ignoreDuplicates: false
        });
        
      if (error) {
        console.error(`Error upserting venue ${venueId}:`, error);
        return {
          success: false,
          updated: false,
          error: error.message
        };
      }
      
      // Mark as synced
      await this.syncService.markSynced(venueId, 'venue');
      
      return {
        success: true,
        updated: true,
        data: venue
      };
    } catch (error) {
      console.error(`Error syncing venue ${venueId}:`, error);
      return {
        success: false,
        updated: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
  
  /**
   * Fetch venue data from all available sources
   */
  private async fetchVenueData(venueId: string): Promise<Venue | null> {
    // First try to get existing venue
    const { data: existingVenue } = await supabase
      .from('venues')
      .select('*')
      .eq('external_id', venueId)
      .single();
      
    let venue = existingVenue as Venue | null;
    
    // Ticketmaster API for venue details
    try {
      const tmData = await this.apiClient.callAPI(
        'ticketmaster',
        `venues/${venueId}`,
        {}
      );
      
      if (tmData) {
        const address = [
          tmData.address?.line1,
          tmData.city?.name
        ].filter(Boolean).join(', ');
        
        venue = {
          id: venue?.id || undefined, // Keep UUID if it exists
          external_id: venueId, // Store Ticketmaster ID as external_id
          name: tmData.name,
          city: tmData.city?.name || (venue?.city || null),
          state: tmData.state?.stateCode || (venue?.state || null),
          country: tmData.country?.countryCode || (venue?.country || null),
          address: address || (venue?.address || null),
          latitude: tmData.location?.latitude || (venue?.latitude || null),
          longitude: tmData.location?.longitude || (venue?.longitude || null),
          url: tmData.url || (venue?.url || null),
          image_url: this.getBestImage(tmData.images) || (venue?.image_url || null),
          // Preserve existing fields
          ...((venue && {
            created_at: venue.created_at,
            updated_at: new Date().toISOString()
          }) || {
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
        };
      }
    } catch (error) {
      console.warn(`Error fetching Ticketmaster data for venue ${venueId}:`, error);
    }
    
    return venue;
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
   * Get upcoming shows at a venue
   */
  async getVenueUpcomingShows(venueId: string): Promise<Show[]> {
    try {
      // First get the venue to ensure it exists
      const { data: venue, error } = await supabase
        .from('venues')
        .select('name, id')
        .or(`id.eq.${venueId},external_id.eq.${venueId}`)
        .single();
        
      if (!venue || error) {
        console.error(`Venue ${venueId} not found for upcoming shows:`, error);
        return [];
      }
      
      // Now get upcoming shows from Ticketmaster
      const response = await this.apiClient.callAPI(
        'ticketmaster',
        'events',
        {
          venueId: venueId, // Use the external ID for API call
          sort: 'date,asc',
          size: 50
        }
      );
      
      if (!response?._embedded?.events) {
        return [];
      }
      
      // Process shows
      const shows: Show[] = [];
      
      for (const event of response._embedded.events) {
        if (!event.id) continue;
        
        const artistId = event._embedded?.attractions?.[0]?.id;
        
        const show: Show = {
          external_id: event.id, // Store external ID
          name: event.name,
          date: event.dates?.start?.dateTime,
          artist_external_id: artistId || null, // Store as external ID
          venue_id: venue.id, // Use UUID of venue
          venue_external_id: venueId, // Store external ID
          status: event.dates?.status?.code || 'active',
          url: event.url,
          image_url: this.getBestImage(event.images),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        shows.push(show);
        
        // Store each show as we find it
        const { error: upsertError } = await supabase
          .from('shows')
          .upsert({
            ...show,
            // Only include artist_id if we have already created the artist
            artist_id: undefined // Will be filled in by artist service
          }, { 
            onConflict: 'external_id',
            ignoreDuplicates: false
          });
          
        if (upsertError) {
          console.error(`Error upserting show ${event.id}:`, upsertError);
        } else {
          // Mark as synced
          await this.syncService.markSynced(event.id, 'show');
        }
      }
      
      return shows;
    } catch (error) {
      console.error(`Error getting upcoming shows for venue ${venueId}:`, error);
      return [];
    }
  }
  
  /**
   * Search for venues by location
   */
  async searchVenues(keyword: string, city?: string, stateCode?: string): Promise<Venue[]> {
    try {
      // Search parameters
      const params: Record<string, any> = {
        keyword,
        size: 10
      };
      
      if (city) params.city = city;
      if (stateCode) params.stateCode = stateCode;
      
      // Search Ticketmaster for venues
      const response = await this.apiClient.callAPI(
        'ticketmaster',
        'venues',
        params
      );
      
      if (!response?._embedded?.venues) {
        return [];
      }
      
      const results: Venue[] = [];
      
      for (const tmVenue of response._embedded.venues) {
        if (!tmVenue.id) continue;
        
        const address = [
          tmVenue.address?.line1,
          tmVenue.city?.name
        ].filter(Boolean).join(', ');
        
        const venue: Venue = {
          external_id: tmVenue.id, // Store external ID
          name: tmVenue.name,
          city: tmVenue.city?.name || null,
          state: tmVenue.state?.stateCode || null,
          country: tmVenue.country?.countryCode || null,
          address: address || null,
          latitude: tmVenue.location?.latitude || null,
          longitude: tmVenue.location?.longitude || null,
          url: tmVenue.url || null,
          image_url: this.getBestImage(tmVenue.images),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        results.push(venue);
        
        // Store each venue as we find them
        const { error } = await supabase
          .from('venues')
          .upsert(venue, { 
            onConflict: 'external_id',
            ignoreDuplicates: false
          });
          
        if (error) {
          console.error(`Error upserting venue ${tmVenue.id}:`, error);
        } else {
          // Mark as synced
          await this.syncService.markSynced(tmVenue.id, 'venue');
        }
      }
      
      return results;
    } catch (error) {
      console.error(`Error searching for venues: ${keyword}`, error);
      return [];
    }
  }
} 