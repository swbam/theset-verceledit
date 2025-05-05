import { createClient } from '@supabase/supabase-js';
import { Database } from '../supabase/types';

export class UnifiedSyncService {
  private supabase;

  constructor() {
    this.supabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }

  async syncArtist(artistId: string, options?: {
    skipDependencies?: boolean;
    forceRefresh?: boolean;
  }) {
    try {
      const { data, error } = await this.supabase.functions.invoke('unified-sync-v2', {
        body: {
          entityType: 'artist',
          entityId: artistId,
          options
        }
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error in UnifiedSyncService.syncArtist:', error);
      throw error;
    }
  }

  async syncShow(showId: string, options?: {
    skipDependencies?: boolean;
    forceRefresh?: boolean;
  }) {
    try {
      const { data, error } = await this.supabase.functions.invoke('unified-sync-v2', {
        body: {
          entityType: 'show',
          entityId: showId,
          options
        }
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error in UnifiedSyncService.syncShow:', error);
      throw error;
    }
  }
 
  async syncVenue(venueId: string, options?: {
    skipDependencies?: boolean;
    forceRefresh?: boolean;
  }) {
    try {
      const { data, error } = await this.supabase.functions.invoke('unified-sync-v2', {
        body: {
          entityType: 'venue',
          entityId: venueId,
          options
        }
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error in UnifiedSyncService.syncVenue:', error);
      throw error;
    }
  }
}

export const unifiedSyncService = new UnifiedSyncService();
