# Concert Setlist Voting App - Sync System Implementation

## Overview

This document provides a comprehensive overview of the data synchronization system implemented for the concert setlist voting web app. The system is designed to efficiently retrieve, store, and update data from multiple external APIs (Ticketmaster, Setlist.fm, and Spotify) while respecting rate limits and avoiding redundant API calls.

## Architecture

The sync system follows a layered architecture:

1. **API Layer**: Route handlers that expose sync functionality to the frontend
2. **Manager Layer**: Orchestrates sync operations across entity types
3. **Service Layer**: Entity-specific services that handle data fetching and processing
4. **Infrastructure Layer**: Supporting services for rate limiting, caching, and incremental sync

## File Structure

```
src/
├── lib/
│   └── sync/
│       ├── api-client.ts        # Rate-limit aware API client
│       ├── cache.ts             # Caching service
│       ├── incremental.ts       # Tracks sync state for entities
│       ├── queue.ts             # Prioritizes sync tasks
│       ├── types.ts             # Type definitions
│       ├── manager.ts           # Central sync orchestrator
│       ├── artist-service.ts    # Artist-specific sync logic
│       ├── venue-service.ts     # Venue-specific sync logic
│       ├── show-service.ts      # Show-specific sync logic
│       ├── setlist-service.ts   # Setlist-specific sync logic
│       └── song-service.ts      # Song-specific sync logic
└── app/
    └── api/
        ├── sync/
        │   └── route.ts         # API endpoints for sync operations
        └── search/
            └── route.ts         # API endpoints for search functionality
```

## Key Components

### 1. API Client Manager (`api-client.ts`)

Handles API rate limits to prevent exceeding quota limits when making requests to external APIs.

```typescript
import { ApiRateLimit } from './types';

/**
 * Rate-limit aware API client manager
 * Prevents rate limit issues with external APIs
 */
export class APIClientManager {
  private rateLimits: Record<string, ApiRateLimit> = {
    ticketmaster: { 
      max: 5,  // 5 requests per second
      window: 1000, // 1 second
      current: 0,
      lastReset: Date.now()
    },
    spotify: {
      max: 30, // 30 requests per minute
      window: 60000, // 1 minute
      current: 0,
      lastReset: Date.now()
    },
    setlistfm: {
      max: 2, // 2 requests per second
      window: 1000, // 1 second
      current: 0,
      lastReset: Date.now()
    }
  };
  
  /**
   * Make an API call with rate limiting
   */
  async callAPI<T>(
    api: 'ticketmaster' | 'spotify' | 'setlistfm', 
    endpoint: string, 
    params?: Record<string, any>,
    apiCallFn?: (endpoint: string, params?: any) => Promise<T>
  ): Promise<T> {
    await this.waitForRateLimit(api);
    
    // Use provided function if available, otherwise use default API clients
    if (apiCallFn) {
      return apiCallFn(endpoint, params);
    }
    
    // Default API clients
    switch(api) {
      case 'ticketmaster':
        return this.callTicketmasterAPI(endpoint, params) as T;
      case 'spotify':
        return this.callSpotifyAPI(endpoint, params) as T;
      case 'setlistfm':
        return this.callSetlistFmAPI(endpoint, params) as T;
      default:
        throw new Error(`Unknown API: ${api}`);
    }
  }
  
  /**
   * Wait for rate limit if needed
   */
  private async waitForRateLimit(api: string): Promise<void> {
    // Implementation details...
  }
  
  /**
   * API-specific call methods
   */
  private async callTicketmasterAPI(endpoint: string, params?: Record<string, any>): Promise<any> {
    // Implementation details...
  }
  
  private async callSpotifyAPI(endpoint: string, params?: Record<string, any>): Promise<any> {
    // Implementation details...
  }
  
  private async callSetlistFmAPI(endpoint: string, params?: Record<string, any>): Promise<any> {
    // Implementation details...
  }
  
  private async getSpotifyToken(clientId: string, clientSecret: string): Promise<string> {
    // Implementation details...
  }
}
```

### 2. Cache Service (`cache.ts`)

Provides efficient multi-layer caching for temporary data during sync operations.

```typescript
import { CacheEntry } from './types';

/**
 * Cache service for storing temporary data during sync operations
 * Handles both in-memory and localStorage caching
 */
export class CacheService {
  private memoryCache: Record<string, CacheEntry<any>> = {};
  private readonly storagePrefix = 'sync_cache:';
  private readonly defaultTTL = 30 * 60 * 1000; // 30 minutes

  /**
   * Get an item from cache (memory or localStorage)
   */
  get<T>(key: string): T | null {
    // Implementation details...
  }

  /**
   * Set an item in cache (both memory and localStorage)
   */
  set<T>(key: string, value: T, ttl: number = this.defaultTTL): void {
    // Implementation details...
  }

  /**
   * Remove an item from cache
   */
  remove(key: string): void {
    // Implementation details...
  }

  /**
   * Clear all cache entries related to an entity type
   */
  clearByPrefix(prefix: string): void {
    // Implementation details...
  }

  /**
   * Clear all sync-related cache
   */
  clearAll(): void {
    // Implementation details...
  }
}
```

### 3. Incremental Sync Service (`incremental.ts`)

Tracks sync state for entities and determines when updates are needed, avoiding unnecessary API calls.

```typescript
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
   * Check if an entity should be synced based on last sync time and options
   */
  async getSyncStatus(entityId: string, entityType: EntityType, options?: SyncOptions): Promise<SyncStatus> {
    // Implementation details...
  }
  
  /**
   * Simplified method to return just boolean if needed
   */
  async shouldSync(entityId: string, entityType: EntityType, options?: SyncOptions): Promise<boolean> {
    // Implementation details...
  }
  
  /**
   * Mark an entity as synced
   */
  async markSynced(entityId: string, entityType: EntityType): Promise<void> {
    // Implementation details...
  }
  
  /**
   * Mark multiple entities as synced (batch operation)
   */
  async markMultipleSynced(entities: EntityRef[]): Promise<void> {
    // Implementation details...
  }
  
  /**
   * Clear sync state for an entity (forces a resync)
   */
  async clearSyncState(entityId: string, entityType: EntityType): Promise<void> {
    // Implementation details...
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
    // Implementation details...
  }
}
```

### 4. Sync Manager (`manager.ts`)

Central orchestrator that manages sync operations across all entity types.

```typescript
import { supabase } from '@/integrations/supabase/client';
import { EntityType, SyncResult, SyncOptions, EntityRef } from './types';
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
  
  constructor() {
    // Initialize services...
  }
  
  /**
   * Sync an entity by type and ID
   * Generic entry point for any entity synchronization
   */
  async syncEntity<T>(type: EntityType, id: string, options?: SyncOptions): Promise<SyncResult<T>> {
    // Implementation details...
  }
  
  /**
   * Create a new entity (initial sync)
   */
  async createSingle(type: EntityType, id: string): Promise<boolean> {
    // Implementation details...
  }
  
  /**
   * Refresh an existing entity
   */
  async refreshSingle(type: EntityType, id: string): Promise<boolean> {
    // Implementation details...
  }
  
  /**
   * Expand relations for an entity (sync related entities)
   */
  async expandRelations(type: EntityType, id: string): Promise<boolean> {
    // Implementation details...
  }
  
  /**
   * Cascade sync for an artist (sync artist and all related shows, setlists)
   */
  async artistCascadeSync(artistId: string): Promise<boolean> {
    // Implementation details...
  }
  
  /**
   * Cascade sync for a venue (sync venue and all related shows)
   */
  async venueCascadeSync(venueId: string): Promise<boolean> {
    // Implementation details...
  }
  
  /**
   * Entity relation expansion methods
   */
  private async expandArtistRelations(artistId: string): Promise<boolean> {
    // Implementation details...
  }
  
  private async expandVenueRelations(venueId: string): Promise<boolean> {
    // Implementation details...
  }
  
  private async expandShowRelations(showId: string): Promise<boolean> {
    // Implementation details...
  }
  
  private async expandSetlistRelations(setlistId: string): Promise<boolean> {
    // Implementation details...
  }
  
  /**
   * Get database table name for entity type
   */
  private getTableName(type: EntityType): string {
    // Implementation details...
  }
  
  /**
   * Get queue status
   */
  getQueueStatus() {
    return this.queue.getStatus();
  }
}
```

### 5. Entity-Specific Services

#### Artist Service (`artist-service.ts`)

```typescript
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
    // Implementation details...
  }
  
  /**
   * Fetch artist data from all available sources
   * Combines data from Ticketmaster/setlist.fm and Spotify for the most complete profile
   */
  private async fetchArtistData(artistId: string): Promise<Artist | null> {
    // Implementation details...
  }
  
  /**
   * Get the best quality image from an array of images
   */
  private getBestImage(images?: Array<{url: string, width: number, height: number}>): string | null {
    // Implementation details...
  }
  
  /**
   * Get upcoming shows for an artist
   */
  async getArtistUpcomingShows(artistId: string): Promise<Show[]> {
    // Implementation details...
  }
  
  /**
   * Search for artists by name
   */
  async searchArtists(name: string): Promise<Artist[]> {
    // Implementation details...
  }
}
```

#### Venue Service (`venue-service.ts`)

Similar structure to the artist service, but for venue data.

#### Show Service (`show-service.ts`)

Similar structure, focused on show/event data.

#### Setlist Service (`setlist-service.ts`)

Similar structure, focused on setlist data from setlist.fm.

#### Song Service (`song-service.ts`)

Similar structure, focused on song data with Spotify enrichment.

### 6. API Routes

#### Sync API (`app/api/sync/route.ts`)

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { SyncManager } from '@/lib/sync/manager';
import { EntityType } from '@/lib/sync/types';
import { createClient } from '@/integrations/supabase/server';

// Initialize sync manager
const syncManager = new SyncManager();

/**
 * API route for initiating entity sync operations
 */
export async function POST(request: NextRequest) {
  // Implementation details...
}

/**
 * API route for checking sync status
 */
export async function GET(request: NextRequest) {
  // Implementation details...
}
```

#### Search API (`app/api/search/route.ts`)

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/integrations/supabase/server';
import { ArtistSyncService } from '@/lib/sync/artist-service';
import { VenueSyncService } from '@/lib/sync/venue-service';
import { ShowSyncService } from '@/lib/sync/show-service';
import { SongSyncService } from '@/lib/sync/song-service';

// Initialize services
const artistService = new ArtistSyncService();
const venueService = new VenueSyncService();
const showService = new ShowSyncService();
const songService = new SongSyncService();

/**
 * API route for searching external data sources
 */
export async function GET(request: NextRequest) {
  // Implementation details...
}

/**
 * API route for getting artist top songs
 */
export async function POST(request: NextRequest) {
  // Implementation details...
}
```

## Data Flow

1. Frontend requests data via API routes
2. API routes delegate to the Sync Manager
3. Sync Manager checks if entities need updating via IncrementalSyncService
4. If update needed, appropriate service fetches data via APIClientManager
5. Retrieved data is stored in Supabase and marked as synced
6. Related entities are queued for sync as needed

## Key Features

- **Rate limiting**: Prevents exceeding API quotas
- **Incremental sync**: Only updates data when needed based on configurable refresh intervals 
- **Cascading updates**: Automatically syncs related entities
- **Multi-source enrichment**: Combines data from multiple APIs for complete profiles
- **Efficient caching**: Reduces database load and API calls

## API Usage Examples

### Search for an artist

```typescript
// GET /api/search?type=artist&query=Coldplay
```

### Sync an artist and all related shows

```typescript
// POST /api/sync
// Body: { type: "artist", id: "K8vZ9175BhV", operation: "cascade_sync" }
```

### Get an artist's top songs

```typescript
// POST /api/search
// Body: { type: "artist_top_songs", id: "K8vZ9175BhV" }
```

## Conclusion

This sync system provides a robust foundation for managing data synchronization between external APIs and the Supabase database. It ensures efficient use of API resources while keeping data up-to-date for the concert setlist voting web app. 