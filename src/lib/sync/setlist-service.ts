import { supabase } from '@/integrations/supabase/client';
import { APIClientManager } from './api-client';
import { IncrementalSyncService } from './incremental';
import { SyncOptions, SyncResult, SetlistData } from './types';
import { Show, Song } from '@/lib/types';

/**
 * Service for syncing setlist data from setlist.fm
 */
export class SetlistSyncService {
  private apiClient: APIClientManager;
  private syncService: IncrementalSyncService;
  
  constructor() {
    this.apiClient = new APIClientManager();
    this.syncService = new IncrementalSyncService();
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
        const { data: setlist } = await supabase
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
      const { error } = await supabase
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
        await supabase
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
      const setlistData = await this.apiClient.callAPI(
        'setlistfm',
        `setlists/${setlistId}`,
        {}
      );
      
      if (!setlistData) {
        return null;
      }
      
      // Extract songs from setlist
      const songs: Song[] = [];
      
      if (setlistData.sets && setlistData.sets.set) {
        setlistData.sets.set.forEach((set: any, setIndex: number) => {
          if (set.song) {
            set.song.forEach((song: any, songIndex: number) => {
              if (song.name) {
                const songId = `${setlistId}-${setIndex}-${songIndex}`;
                songs.push({
                  id: songId,
                  name: song.name,
                  artist_id: setlistData.artist?.mbid || null,
                  encore: set.encore ? 1 : 0,
                  position: songIndex + 1,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString()
                });
              }
            });
          }
        });
      }
      
      // Look up related show based on artist and date
      let showId = null;
      if (setlistData.artist && setlistData.eventDate) {
        // Get the artist ID
        const artistId = setlistData.artist.mbid;
        
        // Parse date from eventDate (DD-MM-YYYY format)
        const dateParts = setlistData.eventDate.split('-');
        if (dateParts.length === 3) {
          const date = new Date(
            parseInt(dateParts[2]), // Year
            parseInt(dateParts[1]) - 1, // Month (0-based)
            parseInt(dateParts[0]) // Day
          );
          
          // Search for shows by artist and date
          const { data: shows } = await supabase
            .from('shows')
            .select('id')
            .eq('artist_id', artistId)
            .gte('date', new Date(date.setHours(0, 0, 0, 0)).toISOString())
            .lt('date', new Date(date.setHours(23, 59, 59, 999)).toISOString());
            
          if (shows && shows.length > 0) {
            showId = shows[0].id;
          }
        }
      }
      
      return {
        showId: showId || '',
        artistId: setlistData.artist?.mbid || '',
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
        const { data: show } = await supabase
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
      const { data: artist } = await supabase
        .from('artists')
        .select('name')
        .eq('id', artistId)
        .single();
        
      if (!artist) {
        console.error(`Unable to find setlist for show ${showId}: artist not found`);
        return false;
      }
      
      // Get show date
      const { data: show } = await supabase
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
      );
      
      if (setlistData && setlistData.setlist && setlistData.setlist.length > 0) {
        const setlist = setlistData.setlist[0];
        
        // Update show with setlist ID
        await supabase
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
   * Get recent setlists for an artist
   */
  async getArtistSetlists(artistId: string, limit = 10): Promise<SetlistData[]> {
    try {
      // Get artist info
      const { data: artist } = await supabase
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
      );
      
      if (!response?.setlist) {
        return [];
      }
      
      const results: SetlistData[] = [];
      const processedIds: Set<string> = new Set();
      
      // Process each setlist (up to limit)
      for (const setlist of response.setlist) {
        if (results.length >= limit) break;
        if (!setlist.id || processedIds.has(setlist.id)) continue;
        
        processedIds.add(setlist.id);
        
        // Sync this setlist
        const syncResult = await this.syncSetlist(setlist.id, { force: true });
        
        if (syncResult.success && syncResult.data) {
          results.push(syncResult.data);
        }
      }
      
      return results;
    } catch (error) {
      console.error(`Error getting recent setlists for artist ${artistId}:`, error);
      return [];
    }
  }
} 