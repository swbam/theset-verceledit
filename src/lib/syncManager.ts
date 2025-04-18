import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';

// Define entity types that can be synced
export type EntityType = 'artist' | 'show' | 'venue' | 'song' | 'setlist';

// Define priority levels for sync tasks
export type SyncPriority = 'high' | 'normal' | 'low';

// Options for queueing a sync task
interface SyncOptions {
  priority?: SyncPriority;
  dependencies?: string[];
  entityName?: string;
  data?: Record<string, any>;
}

/**
 * SyncManager handles the orchestration of background sync tasks
 * It provides methods to queue, process, and check the status of sync operations
 */
export class SyncManager {
  // Create a Supabase client with admin privileges for background operations
  private static getAdminClient() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 
                       (typeof import.meta !== 'undefined' ? import.meta.env.VITE_SUPABASE_URL : undefined) ||
                       "https://kzjnkqeosrycfpxjwhil.supabase.co";
    
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 
                              (typeof import.meta !== 'undefined' ? import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY : undefined);
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase URL or service role key');
    }
    
    return createClient<Database>(supabaseUrl, supabaseServiceKey);
  }

  /**
   * Synchronize an entity immediately (blocking operation)
   * @param entityType Type of entity to sync
   * @param entityId ID of the entity to sync
   * @returns Result of the sync operation
   */
  static async syncEntity(entityType: EntityType, entityId: string) {
    try {
      console.log(`[SyncManager] Starting sync for ${entityType} ${entityId}`);
      const supabase = this.getAdminClient();
      
      // Determine which edge function to call based on entity type
      const functionName = `sync-${entityType}`;
      
      // Call the appropriate edge function
      const { data, error } = await supabase.functions.invoke(functionName, {
        body: { 
          [`${entityType}Id`]: entityId 
        }
      });
      
      if (error) {
        console.error(`[SyncManager] Error syncing ${entityType} ${entityId}:`, error);
        throw error;
      }
      
      console.log(`[SyncManager] Successfully synced ${entityType} ${entityId}`);
      return data;
    } catch (error) {
      console.error(`[SyncManager] Exception in syncEntity:`, error);
      throw error;
    }
  }

  /**
   * Queue a background sync task
   * @param entityType Type of entity to sync
   * @param entityId ID of the entity to sync
   * @param options Additional options for the sync task
   * @returns ID of the created sync task
   */
  static async queueBackgroundSync(
    entityType: EntityType, 
    entityId: string, 
    options: SyncOptions = {}
  ): Promise<string> {
    try {
      console.log(`[SyncManager] Queueing background sync for ${entityType} ${entityId}`);
      const supabase = this.getAdminClient();
      
      // Determine priority value
      const priorityValue = options.priority === 'high' ? 10 : 
                           options.priority === 'low' ? 1 : 5;
      
      // Insert a new sync task
      const { data, error } = await supabase
        .from('sync_tasks')
        .insert({
          entity_type: entityType,
          entity_id: entityId,
          status: 'pending',
          priority: priorityValue,
          dependencies: options.dependencies || [],
          entity_name: options.entityName,
          data: options.data || {}
        })
        .select('id')
        .single();
      
      if (error) {
        console.error(`[SyncManager] Error creating sync task:`, error);
        throw error;
      }
      
      console.log(`[SyncManager] Created sync task ${data.id}`);
      return data.id;
    } catch (error) {
      console.error(`[SyncManager] Exception in queueBackgroundSync:`, error);
      throw error;
    }
  }

  /**
   * Process a batch of background sync tasks
   * @param limit Maximum number of tasks to process
   * @returns Number of tasks processed
   */
  static async processBackgroundTasks(limit = 5): Promise<number> {
    try {
      console.log(`[SyncManager] Processing up to ${limit} background tasks`);
      const supabase = this.getAdminClient();
      
      // Get tasks that are ready to be processed
      // 1. Status is 'pending'
      // 2. All dependencies are completed or don't exist
      const { data: tasks, error } = await supabase
        .rpc('get_sync_tasks', {
          p_status: 'pending',
          p_limit: limit
        });
      
      if (error) {
        console.error(`[SyncManager] Error fetching tasks:`, error);
        throw error;
      }
      
      if (!tasks || tasks.length === 0) {
        console.log(`[SyncManager] No pending tasks found`);
        return 0;
      }
      
      console.log(`[SyncManager] Found ${tasks.length} tasks to process`);
      
      // Process each task
      let processedCount = 0;
      for (const task of tasks) {
        try {
          // Update task status to processing
          await supabase
            .from('sync_tasks')
            .update({ status: 'processing', updated_at: new Date().toISOString() })
            .eq('id', task.id);
          
          // Process the task
          await this.syncEntity(task.entity_type as EntityType, task.entity_id);
          
          // Update task status to completed
          await supabase
            .from('sync_tasks')
            .update({ 
              status: 'completed', 
              updated_at: new Date().toISOString(),
              completed_at: new Date().toISOString()
            })
            .eq('id', task.id);
          
          processedCount++;
        } catch (error) {
          console.error(`[SyncManager] Error processing task ${task.id}:`, error);
          
          // Update task status to failed
          await supabase
            .from('sync_tasks')
            .update({ 
              status: 'failed', 
              updated_at: new Date().toISOString(),
              error: error instanceof Error ? error.message : String(error)
            })
            .eq('id', task.id);
        }
      }
      
      console.log(`[SyncManager] Processed ${processedCount} tasks`);
      return processedCount;
    } catch (error) {
      console.error(`[SyncManager] Exception in processBackgroundTasks:`, error);
      throw error;
    }
  }
}
