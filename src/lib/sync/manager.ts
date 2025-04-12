import { createServiceRoleClient } from '@/integrations/supabase/utils'; // Import the correct utility
import { EntityType, SyncResult, SyncOptions, EntityRef, SyncTask } from './types';
import { ShowSyncService } from './show-service';
import { ArtistSyncService } from './artist-service';
import { VenueSyncService } from './venue-service';
import { SetlistSyncService } from './setlist-service';
import { SongSyncService } from './song-service';
import { IncrementalSyncService } from './incremental';
import { SyncQueue } from './queue';
import { CacheService } from './cache';

/**
 * Central sync manager
 * Orchestrates data synchronization between all entity types
 */
export class SyncManager {
  private showService: ShowSyncService;
  private artistService: ArtistSyncService;
  private venueService: VenueSyncService;
  private setlistService: SetlistSyncService;
  private songService: SongSyncService;
  private incrementalSync: IncrementalSyncService;
  private cache: CacheService;
  private queue: SyncQueue;
  private supabaseAdmin; // Property for the admin client

  constructor() {
    this.supabaseAdmin = createServiceRoleClient(); // Instantiate the admin client
    // Instantiate services, passing 'this' (SyncManager) where needed
    this.showService = new ShowSyncService(); 
    this.artistService = new ArtistSyncService(); 
    this.venueService = new VenueSyncService();   
    this.setlistService = new SetlistSyncService(this); // Needs manager for enqueueTask
    this.songService = new SongSyncService();     
    this.incrementalSync = new IncrementalSyncService(); // Uses its own client
    this.cache = new CacheService(); 
    this.queue = new SyncQueue(this); // Needs manager for processing tasks
  }

  /**
   * Get database table name for entity type
   */
   private getTableName(type: EntityType): string {
    switch(type) {
      case 'artist': return 'artists';
      case 'venue': return 'venues';
      case 'show': return 'shows';
      case 'setlist': return 'setlists';
      case 'song': return 'songs';
      default:
        console.error(`Attempted to get table name for unknown entity type: ${type}`);
        throw new Error(`Unknown entity type: ${type}`);
    }
  }

  /**
   * Sync an entity by type and ID
   * Generic entry point for any entity synchronization
   */
  async syncEntity<T>(type: EntityType, id: string, options?: SyncOptions): Promise<SyncResult<T>> {
    // Check if we need to sync
    const syncStatus = await this.incrementalSync.getSyncStatus(id, type, options);

    if (!syncStatus.needsSync && !options?.force) {
      console.log(`No sync needed for ${type} ${id}`);
      // Try to return existing entity if found and not forced
      try {
        // Use admin client as this might be called server-side without user context
        const { data: existingEntity, error: fetchError } = await this.supabaseAdmin 
          .from(this.getTableName(type) as any) // Cast necessary
          .select('*')
          .eq('id', id) // Assuming 'id' is the primary key
          .maybeSingle();

        if (fetchError) {
          console.error(`Error fetching existing ${type} ${id}:`, fetchError.message);
          // Proceed to sync if fetch fails
        } else if (existingEntity) {
          console.log(`Entity ${type} ${id} found in DB, no sync needed.`);
          return { success: true, updated: false, data: existingEntity as T };
        }
      } catch (fetchCatchError) {
         console.error(`Exception fetching existing ${type} ${id}:`, fetchCatchError);
         // Proceed to sync
      }
    }

    // We need to sync (either forced, not found, or fetch error occurred)
    console.log(`Proceeding to sync ${type} ${id}`);
    try {
      let result: SyncResult<any>;
      switch(type) {
        case 'artist':
          result = await this.artistService.syncArtist(id, options);
          break;
        case 'venue':
          result = await this.venueService.syncVenue(id, options);
          break;
        case 'show':
          result = await this.showService.syncShow(id, options);
          break;
        case 'setlist':
          result = await this.setlistService.syncSetlist(id, options);
          break;
        case 'song':
          result = await this.songService.syncSong(id, options);
          break;
        default:
          return { success: false, updated: false, error: `Unknown entity type: ${type}` };
      }

      // If sync was successful and data was updated, mark as synced
      if (result.success && result.updated) {
        await this.incrementalSync.markSynced(id, type);
      }
      return result as SyncResult<T>;
    } catch (error) {
      console.error(`Error syncing ${type} ${id}:`, error);
      return { success: false, updated: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Create a new entity (initial sync) - Typically called when an external ID is first encountered.
   */
  async createSingle(type: EntityType, id: string): Promise<boolean> {
    console.log(`SyncManager: createSingle called for ${type} ${id}`);
    try {
      // syncEntity handles the upsert logic (create or update)
      const result = await this.syncEntity(type, id, { force: true }); 
      console.log(`SyncManager: createSingle result for ${type} ${id}: ${result.success}`);
      return result.success;
    } catch (error) {
      console.error(`Error in createSingle for ${type} ${id}:`, error);
      return false;
    }
  }

  /**
   * Refresh an existing entity - Forces an update check.
   */
  async refreshSingle(type: EntityType, id: string): Promise<boolean> {
     console.log(`SyncManager: refreshSingle called for ${type} ${id}`);
    try {
      const result = await this.syncEntity(type, id, { force: true });
      console.log(`SyncManager: refreshSingle result for ${type} ${id}: ${result.success}`);
      return result.success;
    } catch (error) {
      console.error(`Error in refreshSingle for ${type} ${id}:`, error);
      return false;
    }
  }

  /**
   * Expand relations for an entity (queue related entities for sync)
   */
  async expandRelations(type: EntityType, id: string): Promise<boolean> {
     console.log(`SyncManager: expandRelations called for ${type} ${id}`);
    try {
      switch (type) {
        case 'artist': return await this.expandArtistRelations(id);
        case 'venue': return await this.expandVenueRelations(id);
        case 'show': return await this.expandShowRelations(id);
        case 'setlist': return await this.expandSetlistRelations(id);
        default:
          console.warn(`Expansion not supported for type: ${type}`);
          return false;
      }
    } catch (error) {
      console.error(`Error expanding relations for ${type} ${id}:`, error);
      return false;
    }
  }

  /**
   * Cascade sync for an artist (sync artist and queue related shows/setlists)
   * Assumes artistId is the internal UUID.
   */
  async artistCascadeSync(artistId: string): Promise<boolean> {
     console.log(`SyncManager: artistCascadeSync called for ${artistId}`);
    try {
      // Sync the artist first (using internal ID)
      const artistResult = await this.syncEntity('artist', artistId, { force: true });
      if (!artistResult.success) {
         console.warn(`Failed to sync artist ${artistId} during cascade.`);
         // Continue trying to queue related items even if artist sync fails? Or return false?
         // Let's return false for now.
         return false; 
      }

      // Queue related shows (using internal artist ID)
      const { data: relatedShows, error: showsError } = await this.supabaseAdmin
        .from('shows')
        .select('id') // Select internal show ID
        .eq('artist_id', artistId); 

      if (showsError) {
         console.error(`Error fetching related shows for artist ${artistId}:`, showsError.message);
      } else if (relatedShows && relatedShows.length > 0) {
        console.log(`Queueing ${relatedShows.length} related shows for artist ${artistId}`);
        for (const show of relatedShows) {
          if (show?.id) await this.enqueueTask({ type: 'show', id: show.id, priority: 'medium', operation: 'refresh' });
        }
      }

      // Queue related setlists (using internal artist ID)
      // Assumes setlists table's artist_id is the internal UUID
      const { data: relatedSetlists, error: setlistsError } = await this.supabaseAdmin
        .from('setlists')
        .select('id') // Select setlist.fm ID (PK)
        .eq('artist_id', artistId); 

      if (setlistsError) {
         console.error(`Error fetching related setlists for artist ${artistId}:`, setlistsError.message);
      } else if (relatedSetlists && relatedSetlists.length > 0) {
        console.log(`Queueing ${relatedSetlists.length} related setlists for artist ${artistId}`);
        for (const setlist of relatedSetlists) {
           if (setlist?.id) await this.enqueueTask({ type: 'setlist', id: setlist.id, priority: 'medium', operation: 'refresh' });
        }
      }
      return true;
    } catch (error) {
      console.error(`Error performing cascade sync for artist ${artistId}:`, error);
      return false;
    }
  }

  /**
   * Cascade sync for a venue (sync venue and queue related shows)
   * Assumes venueId is the internal UUID.
   */
  async venueCascadeSync(venueId: string): Promise<boolean> {
     console.log(`SyncManager: venueCascadeSync called for ${venueId}`);
    try {
      // Sync the venue first (using internal ID)
      const venueResult = await this.syncEntity('venue', venueId, { force: true });
      if (!venueResult.success) {
         console.warn(`Failed to sync venue ${venueId} during cascade.`);
         return false;
      }

      // Queue related shows (using internal venue ID)
      const { data: relatedShows, error: showsError } = await this.supabaseAdmin
        .from('shows')
        .select('id') // Select internal show ID
        .eq('venue_id', venueId);

      if (showsError) {
         console.error(`Error fetching related shows for venue ${venueId}:`, showsError.message);
      } else if (relatedShows && relatedShows.length > 0) {
        console.log(`Queueing ${relatedShows.length} related shows for venue ${venueId}`);
        for (const show of relatedShows) {
           if (show?.id) await this.enqueueTask({ type: 'show', id: show.id, priority: 'medium', operation: 'refresh' });
        }
      }
      return true;
    } catch (error) {
      console.error(`Error performing cascade sync for venue ${venueId}:`, error);
      return false;
    }
  }

  /**
   * Expand artist relations - Queue upcoming shows for creation/refresh.
   * Assumes artistId is the external ID (e.g., Ticketmaster ID).
   */
  private async expandArtistRelations(artistId: string): Promise<boolean> { 
    console.log(`SyncManager: expandArtistRelations called for external artist ${artistId}`);
    try {
      // This method likely belongs more within ArtistSyncService, but keeping here for now.
      const shows = await this.artistService.getArtistUpcomingShows(artistId); // Fetches from TM
      console.log(`Found ${shows.length} upcoming shows to queue for artist ${artistId}`);
      for (const show of shows) {
        // Queue using the external ID for creation/upsert
        if (show?.external_id) { 
          await this.enqueueTask({ type: 'show', id: show.external_id, priority: 'medium', operation: 'create' }); 
        }
      }
      return true;
    } catch (error) {
      console.error(`Error expanding artist relations for ${artistId}:`, error);
      return false;
    }
  }

  /**
   * Expand venue relations - Queue upcoming shows for creation/refresh.
   * Assumes venueId is the external ID (e.g., Ticketmaster ID).
   */
  private async expandVenueRelations(venueId: string): Promise<boolean> { 
     console.log(`SyncManager: expandVenueRelations called for external venue ${venueId}`);
    try {
      // This method likely belongs more within VenueSyncService.
      const shows = await this.venueService.getVenueUpcomingShows(venueId); // Fetches from TM
      console.log(`Found ${shows.length} upcoming shows to queue for venue ${venueId}`);
      for (const show of shows) {
         // Queue using the external ID for creation/upsert
        if (show?.external_id) { 
          await this.enqueueTask({ type: 'show', id: show.external_id, priority: 'medium', operation: 'create' }); 
        }
      }
      return true;
    } catch (error) {
      console.error(`Error expanding venue relations for ${venueId}:`, error);
      return false;
    }
  }

  /**
   * Expand show relations - Queue related artist, venue, and setlist for refresh.
   * Assumes showId is the internal UUID.
   */
  private async expandShowRelations(showId: string): Promise<boolean> { 
     console.log(`SyncManager: expandShowRelations called for show ${showId}`);
    try {
      const { data: show, error: showError } = await this.supabaseAdmin
        .from('shows')
        .select('artist_id, venue_id, setlist_id') // Select internal FKs and setlist.fm ID
        .eq('id', showId) 
        .maybeSingle(); 

      if (showError) {
         console.error(`Error fetching show ${showId} for relation expansion:`, showError.message);
         return false;
      }
      if (!show) { 
         console.warn(`Show ${showId} not found for relation expansion.`);
         return false;
      }

      // Queue artist refresh (using internal ID)
      if (show.artist_id) {
        console.log(`Queueing artist ${show.artist_id} refresh for show ${showId}`);
        await this.enqueueTask({ type: 'artist', id: show.artist_id, priority: 'high', operation: 'refresh' });
      }

      // Queue venue refresh (using internal ID)
      if (show.venue_id) {
        console.log(`Queueing venue ${show.venue_id} refresh for show ${showId}`);
        await this.enqueueTask({ type: 'venue', id: show.venue_id, priority: 'high', operation: 'refresh' });
      }

      // Queue setlist refresh (using setlist.fm ID stored in show.setlist_id)
      if (show.setlist_id) { 
         console.log(`Queueing setlist ${show.setlist_id} refresh for show ${showId}`);
         await this.enqueueTask({ type: 'setlist', id: show.setlist_id, priority: 'high', operation: 'refresh' });
      } else {
        // If no setlist linked, try to find one using the service
        console.log(`Attempting to find setlist for show ${showId}`);
        // Pass internal artist_id if it exists
        if (show.artist_id) {
           await this.setlistService.findSetlistForShow(showId, show.artist_id); 
        } else {
           console.warn(`Cannot find setlist for show ${showId} without an artist_id.`);
        }
      }
      return true;
    } catch (error) {
      console.error(`Error expanding show relations for ${showId}:`, error);
      return false;
    }
  }

  /**
   * Expand setlist relations - Queue related songs and show for refresh.
   * Assumes setlistId is the setlist.fm ID (PK of setlists table).
   */
  private async expandSetlistRelations(setlistId: string): Promise<boolean> { 
     console.log(`SyncManager: expandSetlistRelations called for setlist ${setlistId}`);
    try {
      const { data: setlist, error: setlistError } = await this.supabaseAdmin
        .from('setlists')
        .select('show_id, songs') // Select internal show_id (UUID) and songs array
        .eq('id', setlistId) 
        .maybeSingle(); 

      if (setlistError) {
         console.error(`Error fetching setlist ${setlistId} for relation expansion:`, setlistError.message);
         return false;
      }
      if (!setlist) { 
         console.warn(`Setlist ${setlistId} not found for relation expansion.`);
         return false;
      }

      // Queue songs for refresh
      // Assumes songs array contains objects with an 'id' (could be spotify ID or generated setlist-song ID)
      if (setlist.songs && Array.isArray(setlist.songs)) { 
        console.log(`Queueing ${setlist.songs.length} songs from setlist ${setlistId}`);
        for (const song of setlist.songs) {
          if (song?.id) { 
            await this.enqueueTask({ type: 'song', id: song.id, priority: 'low', operation: 'refresh' });
          }
        }
      }

      // Queue associated show for refresh (using internal show UUID)
      if (setlist.show_id) { 
        console.log(`Queueing show ${setlist.show_id} refresh for setlist ${setlistId}`);
        await this.enqueueTask({ type: 'show', id: setlist.show_id, priority: 'medium', operation: 'refresh' });
      }
      return true;
    } catch (error) {
      console.error(`Error expanding setlist relations for ${setlistId}:`, error);
      return false;
    }
  }

  /**
   * Get queue status
   */
  getQueueStatus() {
    if (!this.queue) {
       console.warn("SyncQueue not initialized when calling getQueueStatus.");
       return { pending: 0, active: 0, maxConcurrent: 0, byPriority: {}, byType: {} };
    }
    return this.queue.getStatus();
  }

  /**
   * Public method to add a task to the sync queue
   */
  async enqueueTask(task: SyncTask): Promise<void> {
    if (!this.queue) {
        console.error("SyncQueue not initialized in SyncManager when calling enqueueTask!");
        return;
    }
    await this.queue.add(task); // Use await as queue.add is async
  }
}
