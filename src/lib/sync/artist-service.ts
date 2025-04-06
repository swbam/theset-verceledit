import { supabase } from '@/integrations/supabase/client';
import { APIClientManager } from './api-client';
import { IncrementalSyncService } from './incremental';
import { SyncOptions, SyncResult } from './types';
import { Artist, Show } from '@/lib/types';

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
        const { data: artist } = await supabase
          .from('artists')
          .select('*')
          .eq('id', artistId)
          .single();
          
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
      
      // Update in database
      const { error } = await supabase
        .from('artists')
        .upsert(artist, { onConflict: 'id' });
        
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
      .eq('id', artistId)
      .single();
      
    let artist = existingArtist as Artist | null;
    
    // Ticketmaster API for artist details
    try {
      const tmData = await this.apiClient.callAPI(
        'ticketmaster',
        `attractions/${artistId}`,
        { }
      );
      
      if (tmData) {
        artist = {
          id: artistId,
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
        );
        
        if (spotifyData && spotifyData.artists && spotifyData.artists.items.length > 0) {
          const spotifyArtist = spotifyData.artists.items[0];
          
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
      const { data: artist } = await supabase
        .from('artists')
        .select('name')
        .eq('id', artistId)
        .single();
        
      if (!artist) {
        console.error(`Artist ${artistId} not found for upcoming shows`);
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
      );
      
      if (!response?._embedded?.events) {
        return [];
      }
      
      // Process shows
      const shows: Show[] = [];
      
      for (const event of response._embedded.events) {
        if (!event.id) continue;
        
        const venueId = event._embedded?.venues?.[0]?.id;
        
        const show: Show = {
          id: event.id,
          name: event.name,
          date: event.dates?.start?.dateTime,
          artist_id: artistId,
          venue_id: venueId || null,
          status: event.dates?.status?.code || 'active',
          url: event.url,
          image_url: this.getBestImage(event.images),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        shows.push(show);
        
        // Store each show as we find it
        await supabase
          .from('shows')
          .upsert(show, { onConflict: 'id' });
          
        // Mark as synced
        await this.syncService.markSynced(event.id, 'show');
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
      );
      
      if (!response?._embedded?.attractions) {
        return [];
      }
      
      const results: Artist[] = [];
      
      for (const attraction of response._embedded.attractions) {
        if (!attraction.id || attraction.type !== 'attraction') continue;
        
        const artist: Artist = {
          id: attraction.id,
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
        await supabase
          .from('artists')
          .upsert(artist, { onConflict: 'id' });
          
        // Mark as synced
        await this.syncService.markSynced(attraction.id, 'artist');
      }
      
      return results;
    } catch (error) {
      console.error(`Error searching for artists: ${name}`, error);
      return [];
    }
  }
} 