import { supabase } from '@/integrations/supabase/client';
import { EntityType, CURRENT_SYNC_VERSION, SyncStatus, SyncOptions, DEFAULT_REFRESH_INTERVALS, EntityRef } from './types';
import { CacheService } from './cache';

/**
 * Incremental sync service
 * Tracks sync state for entities and determines whether they need updates
 */
export class IncrementalSyncService {
  private cache: CacheService;
  private readonly cachePrefix = 'sync_state:';
  
  constructor() {
    this.cache = new CacheService();
  }
  
  /**
   * Check if an entity should be synced based on its last sync time and options
   */
  async getSyncStatus(entityId: string, entityType: EntityType, options?: SyncOptions): Promise<SyncStatus> {
    if (options?.force) {
      return { 
        needsSync: true, 
        reason: 'Force sync requested'
      };
    }
    
    // Generate a unique key for this entity
    const cacheKey = `${this.cachePrefix}${entityType}:${entityId}`;
    
    // Check cache first
    const cached = this.cache.get<{lastSynced: number, syncVersion: number}>(cacheKey);
    if (cached) {
      return this.checkSyncNeeded(entityType, cached.lastSynced, cached.syncVersion, options);
    }
    
    // Check database state
    try {
      const { data } = await supabase
        .from('sync_states')
        .select('last_synced, sync_version')
        .eq('entity_id', entityId)
        .eq('entity_type', entityType)
        .single();
        
      if (!data) {
        return {
          needsSync: true,
          reason: 'Never synced'
        };
      }
      
      const lastSynced = new Date(data.last_synced).getTime();
      
      // Cache for future checks - keep for 1 hour
      this.cache.set(cacheKey, {
        lastSynced,
        syncVersion: data.sync_version
      }, 60 * 60 * 1000);
      
      return this.checkSyncNeeded(entityType, lastSynced, data.sync_version, options);
    } catch (error) {
      console.error(`Error checking sync state for ${entityType} ${entityId}:`, error);
      return {
        needsSync: true,
        reason: 'Error checking sync state'
      };
    }
  }
  
  /**
   * Simplified method to return just boolean if needed
   */
  async shouldSync(entityId: string, entityType: EntityType, options?: SyncOptions): Promise<boolean> {
    const status = await this.getSyncStatus(entityId, entityType, options);
    return status.needsSync;
  }
  
  /**
   * Mark an entity as synced
   */
  async markSynced(entityId: string, entityType: EntityType): Promise<void> {
    const now = Date.now();
    const cacheKey = `${this.cachePrefix}${entityType}:${entityId}`;
    
    // Update cache
    this.cache.set(cacheKey, {
      lastSynced: now,
      syncVersion: CURRENT_SYNC_VERSION
    }, 60 * 60 * 1000); // Cache for 1 hour
    
    // Update database
    try {
      await supabase
        .from('sync_states')
        .upsert({
          entity_id: entityId,
          entity_type: entityType,
          last_synced: new Date(now).toISOString(),
          sync_version: CURRENT_SYNC_VERSION
        }, { onConflict: ['entity_id', 'entity_type'] });
    } catch (error) {
      console.error(`Error marking sync state for ${entityType} ${entityId}:`, error);
    }
  }
  
  /**
   * Mark multiple entities as synced (batch operation)
   */
  async markMultipleSynced(entities: EntityRef[]): Promise<void> {
    const now = Date.now();
    const isoNow = new Date(now).toISOString();
    
    // Update cache for all entities
    entities.forEach(entity => {
      const cacheKey = `${this.cachePrefix}${entity.type}:${entity.id}`;
      this.cache.set(cacheKey, {
        lastSynced: now,
        syncVersion: CURRENT_SYNC_VERSION
      }, 60 * 60 * 1000);
    });
    
    // Prepare batch update
    const updates = entities.map(entity => ({
      entity_id: entity.id,
      entity_type: entity.type,
      last_synced: isoNow,
      sync_version: CURRENT_SYNC_VERSION
    }));
    
    try {
      await supabase
        .from('sync_states')
        .upsert(updates, { onConflict: ['entity_id', 'entity_type'] });
    } catch (error) {
      console.error(`Error marking sync state for ${entities.length} entities:`, error);
    }
  }
  
  /**
   * Clear sync state for an entity (forces a resync)
   */
  async clearSyncState(entityId: string, entityType: EntityType): Promise<void> {
    const cacheKey = `${this.cachePrefix}${entityType}:${entityId}`;
    
    // Remove from cache
    this.cache.remove(cacheKey);
    
    // Remove from database
    try {
      await supabase
        .from('sync_states')
        .delete()
        .eq('entity_id', entityId)
        .eq('entity_type', entityType);
    } catch (error) {
      console.error(`Error clearing sync state for ${entityType} ${entityId}:`, error);
    }
  }
  
  /**
   * Check if sync is needed based on type, last sync time, and version
   */
  private checkSyncNeeded(
    entityType: EntityType, 
    lastSynced: number, 
    syncVersion: number,
    options?: SyncOptions
  ): SyncStatus {
    const now = Date.now();
    
    // Check if current sync version is outdated
    if (syncVersion < CURRENT_SYNC_VERSION) {
      return {
        needsSync: true,
        reason: 'Sync version outdated',
        lastSynced
      };
    }
    
    // Use provided refresh interval or defaults
    const refreshInterval = options?.refreshInterval || DEFAULT_REFRESH_INTERVALS[entityType];
    
    // Check if refresh interval has passed
    if (now - lastSynced > refreshInterval) {
      return {
        needsSync: true,
        reason: 'Refresh interval exceeded',
        lastSynced
      };
    }
    
    return {
      needsSync: false,
      lastSynced
    };
  }
} 