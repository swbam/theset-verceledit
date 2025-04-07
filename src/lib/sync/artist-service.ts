import { supabase } from '@/integrations/supabase/client';
import { APIClientManager } from './api-client';
import { IncrementalSyncService } from './incremental';
import { SyncOptions, SyncResult } from './types';
import { Artist, Show } from '@/lib/types'; // Assuming Show type is defined correctly here or needs update

// --- Interfaces for API Responses ---
// Simplified - add more detail as needed
interface TmImage {
  url: string;
  width: number;
  height: number;
}

interface TmAttraction {
  id: string;
  name: string;
  url?: string;
  images?: TmImage[];
  type?: string; // Add type property
}

interface TmVenue {
  id: string;
}

interface TmEventDateInfo {
  start?: { dateTime?: string };
  status?: { code?: string };
}

interface TmEvent {
  id: string;
  name: string;
  url?: string;
  images?: TmImage[];
  dates?: TmEventDateInfo;
  _embedded?: {
    venues?: TmVenue[];
    attractions?: TmAttraction[]; // Added for consistency, though not directly used in show loop
  };
}

interface TmAttractionResponse {
  _embedded?: {
    attractions?: TmAttraction[];
  };
}

interface TmEventResponse {
  _embedded?: {
    events?: TmEvent[];
  };
}

interface SpotifyArtist {
  id: string;
  name: string; // For debugging/logging
  external_urls?: { spotify?: string };
  genres?: string[];
  popularity?: number;
  images?: TmImage[];
}

interface SpotifySearchResponse {
  artists?: {
    items?: SpotifyArtist[];
  };
}
// --- End Interfaces ---

/**
 * Service for syncing artist data from external APIs
 */
export class ArtistSyncService {
  private apiClient: APIClientManager;
  private syncService: IncrementalSyncService;
  
  constructor() {
    this.apiClient = new APIClientManager();
    this.syncService = new IncrementalSyncService();
  }
  
  /**
   * Sync an artist by ID
   */
  async syncArtist(artistId: string, options?: SyncOptions): Promise<SyncResult<Artist>> {
    try {
      // Check if we need to sync
      const syncStatus = await this.syncService.getSyncStatus(artistId, 'artist', options);
      
      if (!syncStatus.needsSync) {
        // Get existing artist data
        const { data: artist, error: fetchError } = await supabase
          .from('artists')
          .select('*')
          .eq('id', artistId)
          .single();
          
        if (fetchError || !artist) {
          console.error(`Error fetching existing artist ${artistId}:`, fetchError);
          return {
            success: false,
            updated: false,
            error: fetchError?.message || 'Artist not found'
          };
        }
          
        return {
          success: true,
          updated: false,
          data: artist as Artist
        };
      }
      
      // We need to sync - fetch from APIs
      const artist = await this.fetchArtistData(artistId);
      
      if (!artist) {
        return {
          success: false,
          updated: false,
          error: 'Failed to fetch artist data'
        };
      }
      
      // Ensure we have an external_id for tracking purposes
      artist.external_id = artistId;
      
      // Update in database
      console.log(`Upserting artist data for ID ${artistId}:`, artist);
      const { error } = await supabase
        .from('artists')
        .upsert(artist, { 
          onConflict: 'external_id',
          ignoreDuplicates: false 
        });
        
      if (error) {
        console.error(`Error upserting artist ${artistId}:`, error);
        return {
          success: false,
          updated: false,
          error: error.message
        };
      }
      
      // Mark as synced
      await this.syncService.markSynced(artistId, 'artist');
      
      return {
        success: true,
        updated: true,
        data: artist
      };
    } catch (error) {
      console.error(`Error syncing artist ${artistId}:`, error);
      return {
        success: false,
        updated: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
  
  /**
   * Fetch artist data from all available sources
   * Combines data from Ticketmaster/setlist.fm and Spotify for the most complete profile
   */
  private async fetchArtistData(artistId: string): Promise<Artist | null> {
    // First try to get existing artist
    const { data: existingArtist } = await supabase
      .from('artists')
      .select('*')
      .eq('external_id', artistId)
      .single();
      
    let artist = existingArtist as Artist | null;
    
    // Ticketmaster API for artist details
    try {
      const tmData = await this.apiClient.callAPI(
        'ticketmaster',
        `attractions/${artistId}`,
        { }
      ) as TmAttraction | null; // Assert type
      
      if (tmData) {
        artist = {
          id: artist?.id || undefined, // Keep UUID if it exists
          external_id: artistId, // Store Ticketmaster ID as external_id
          name: tmData.name,
          image_url: this.getBestImage(tmData.images),
          url: tmData.url,
          // Placeholder fields for Spotify data
          spotify_id: artist?.spotify_id || null,
          spotify_url: artist?.spotify_url || null,
          genres: artist?.genres || [],
          popularity: artist?.popularity || null,
          // Preserve existing fields
          ...((artist && {
            created_at: artist.created_at,
            updated_at: new Date().toISOString()
          }) || {
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
        };
      }
    } catch (error) {
      console.warn(`Error fetching Ticketmaster data for artist ${artistId}:`, error);
      // Continue with other sources
    }
    
    // If we have an artist, enrich with Spotify data
    if (artist) {
      try {
        // Search Spotify by artist name
        const spotifyData = await this.apiClient.callAPI(
          'spotify',
          'search',
          {
            q: artist.name,
            type: 'artist',
            limit: 1
          }
        ) as SpotifySearchResponse | null; // Assert type
        
        // Refined check for Spotify data
        if (spotifyData?.artists?.items && spotifyData.artists.items.length > 0) {
          const spotifyArtist = spotifyData.artists.items[0]; // Now safe to access
          
          // Update with Spotify data
          artist.spotify_id = spotifyArtist.id;
          artist.spotify_url = spotifyArtist.external_urls?.spotify || null;
          artist.genres = spotifyArtist.genres || [];
          artist.popularity = spotifyArtist.popularity || null;
          
          // If Spotify has a better image, use it
          if (!artist.image_url && spotifyArtist.images && spotifyArtist.images.length > 0) {
            artist.image_url = spotifyArtist.images[0].url;
          }
        }
      } catch (error) {
        console.warn(`Error fetching Spotify data for artist ${artistId}:`, error);
      }
    }
    
    return artist;
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
   * Get upcoming shows for an artist
   */
  async getArtistUpcomingShows(artistId: string): Promise<Show[]> {
    try {
      // First get the artist to ensure we have the name
      const { data: artist, error } = await supabase
        .from('artists')
        .select('name, id')
        .or(`id.eq.${artistId},external_id.eq.${artistId}`)
        .single();
        
      if (!artist || error) {
        console.error(`Artist ${artistId} not found for upcoming shows:`, error);
        return [];
      }
      
      // Now get upcoming shows from Ticketmaster
      const response = await this.apiClient.callAPI(
        'ticketmaster',
        'events',
        {
          attractionId: artistId,
          sort: 'date,asc',
          size: 50
        }
      ) as TmEventResponse | null; // Assert type
      
      if (!response?._embedded?.events) {
        return [];
      }
      
      // Process shows
      const shows: Show[] = [];
      
      for (const event of response._embedded.events) {
        if (!event.id) continue;
        
        const venueId = event._embedded?.venues?.[0]?.id;
        
        // Construct show object matching the 'shows' table schema
        const show = { // Don't explicitly type as Show if Show type definition is outdated
          external_id: event.id, // Correct: Use TM event ID
          name: event.name,      // Correct
          date: event.dates?.start?.dateTime || null, // Correct
          artist_id: artist.id, // Correct: Use internal artist UUID
          // venue_id: null, // Set explicitly to null if venue not synced yet (handled in upsert below)
          ticket_url: event.url || null, // Correct: Use ticket_url column name
          image_url: this.getBestImage(event.images), // Correct
          popularity: 0, // Default popularity, adjust if needed
          // created_at and updated_at are handled by DB defaults/triggers usually
          // Remove fields not in 'shows' table: venue_external_id, status
        };
        
        shows.push(show);
        
        // Store each show as we find it
        const { error: upsertError } = await supabase
          .from('shows')
          .upsert({
            ...show,
            // Explicitly set venue_id to null if not yet known/synced.
            // The venue sync process should update this later.
            venue_id: null
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
      console.error(`Error getting upcoming shows for artist ${artistId}:`, error);
      return [];
    }
  }
  
  /**
   * Search for artists by name
   */
  async searchArtists(name: string): Promise<Artist[]> {
    try {
      // Search Ticketmaster for artists
      const response = await this.apiClient.callAPI(
        'ticketmaster',
        'attractions',
        {
          keyword: name,
          classificationName: 'music', // Ensures we only get music artists
          size: 10
        }
      ) as TmAttractionResponse | null; // Assert type
      
      if (!response?._embedded?.attractions) {
        return [];
      }
      
      const results: Artist[] = [];
      
      for (const attraction of response._embedded.attractions) {
        if (!attraction.id || attraction.type !== 'attraction') continue;
        
        const artist: Artist = {
          external_id: attraction.id, // Store external ID 
          name: attraction.name,
          image_url: this.getBestImage(attraction.images),
          url: attraction.url,
          spotify_id: null,
          spotify_url: null,
          genres: [],
          popularity: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        results.push(artist);
        
        // Store each artist as we find them
        const { error } = await supabase
          .from('artists')
          .upsert(artist, { 
            onConflict: 'external_id',
            ignoreDuplicates: false
          });
          
        if (error) {
          console.error(`Error upserting artist ${attraction.id}:`, error);
        } else {
          // Mark as synced
          await this.syncService.markSynced(attraction.id, 'artist');
        }
      }
      
      return results;
    } catch (error) {
      console.error(`Error searching for artists: ${name}`, error);
      return [];
    }
  }
} 