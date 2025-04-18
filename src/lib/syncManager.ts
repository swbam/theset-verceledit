import { supabase } from '@/integrations/supabase/client';

type EntityType = 'artist' | 'venue' | 'show' | 'setlist' | 'song';

/**
 * SyncManager provides methods to manage data synchronization between external APIs
 * and the local database.
 */
export class SyncManager {
  /**
   * Start a sync for a specific entity
   */
  static async syncEntity(entityType: EntityType, entityId: string) {
    console.log(`[SyncManager] Starting sync for ${entityType} ${entityId}`);
    
    try {
      // First try the API endpoint, which is more robust
      const apiResponse = await fetch('/api/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          operation: entityType,
          [`${entityType}Id`]: entityId
        })
      });
      
      if (apiResponse.ok) {
        const data = await apiResponse.json();
        console.log(`[SyncManager] API sync successful for ${entityType} ${entityId}`, data);
        return { success: true, data };
      }
      
      console.warn(`[SyncManager] API sync failed, falling back to direct function call`);
      
      // Fallback to direct edge function call
      const functionName = `sync-${entityType}`;
      const { data, error } = await supabase.functions.invoke(functionName, {
        body: { [`${entityType}Id`]: entityId }
      });
      
      if (error) {
        throw error;
      }
      
      console.log(`[SyncManager] Direct sync successful for ${entityType} ${entityId}`, data);
      return { success: true, data };
      
    } catch (error) {
      console.error(`[SyncManager] Sync failed for ${entityType} ${entityId}:`, error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
  
  /**
   * Queue a background sync task
   */
  static async queueBackgroundSync(entityType: EntityType, entityId: string) {
    console.log(`[SyncManager] Queueing background sync for ${entityType} ${entityId}`);
    
    try {
      const response = await fetch('/api/background-sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          operation: 'start',
          entityType,
          entityId
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Unknown error');
      }
      
      console.log(`[SyncManager] Successfully queued background sync`);
      return { success: true, data };
      
    } catch (error) {
      console.error(`[SyncManager] Failed to queue background sync:`, error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
  
  /**
   * Process pending background sync tasks
   */
  static async processBackgroundTasks(limit = 5) {
    console.log(`[SyncManager] Processing up to ${limit} background tasks`);
    
    try {
      const response = await fetch('/api/background-sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          operation: 'process',
          limit
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Unknown error');
      }
      
      console.log(`[SyncManager] Successfully processed background tasks`);
      return { success: true, data };
      
    } catch (error) {
      console.error(`[SyncManager] Failed to process background tasks:`, error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
  
  /**
   * Cascade sync an entity and all its dependencies
   */
  static async cascadeSync(entityType: EntityType, entityId: string) {
    console.log(`[SyncManager] Starting cascade sync for ${entityType} ${entityId}`);
    
    try {
      const response = await fetch('/api/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          operation: 'cascade_sync',
          [`${entityType}Id`]: entityId
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Unknown error');
      }
      
      console.log(`[SyncManager] Successfully cascade synced ${entityType} ${entityId}`);
      return { success: true, data };
      
    } catch (error) {
      console.error(`[SyncManager] Failed to cascade sync:`, error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
  
  /**
   * Get the status of background sync tasks
   */
  static async getSyncStatus(entityType?: EntityType, entityId?: string) {
    console.log(`[SyncManager] Getting sync status`);
    
    try {
      const response = await fetch('/api/background-sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          operation: 'status',
          entityType,
          entityId
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Unknown error');
      }
      
      return { success: true, data };
      
    } catch (error) {
      console.error(`[SyncManager] Failed to get sync status:`, error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
}
