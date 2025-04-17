// Types for sync operations - moved from src/lib/sync/types.ts
export enum EntityType {
  Artist = 'artist',
  Venue = 'venue',
  Show = 'show',
  Song = 'song',
  Setlist = 'setlist'
}

export type SyncOperation = 'create' | 'update' | 'delete' | 'refresh';

export type PriorityLevel = 'high' | 'medium' | 'low';

export interface SyncTask {
  id?: string;
  type: EntityType;
  operation: SyncOperation;
  priority: PriorityLevel;
  payload?: any;
  status?: 'pending' | 'processing' | 'completed' | 'failed';
  error?: string;
  created_at?: string;
  updated_at?: string;
}

export interface SyncState {
  entity_id: string;
  entity_type: EntityType;
  external_id?: string;
  last_synced: string;
  sync_version: number;
  error?: string;
}