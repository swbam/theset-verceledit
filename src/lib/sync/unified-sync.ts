import { createClient } from '@supabase/supabase-js';

/**
 * Types for sync operation parameters
 */
export interface SyncOptions {
  forceRefresh?: boolean;
  skipDependencies?: boolean;
}

/**
 * Sync status type from the database
 */
export interface SyncStatus {
  ticketmaster?: 'pending' | 'syncing' | 'success' | 'error';
  spotify?: 'pending' | 'syncing' | 'success' | 'error';
  step?: string;
  progress?: number;
  total_steps?: number;
  timestamp?: string;
  shows_count?: number;
  songs_count?: number;
  error?: string;
}

/**
 * Possible entity types for sync
 */
export type EntityType = 'artist' | 'show' | 'venue';

/**
 * Initialize Supabase client for public (client-side) operations
 */
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

/**
 * Trigger a sync operation for an artist
 */
export async function syncArtist(
  ticketmasterId: string,
  spotifyId?: string,
  options?: SyncOptions
): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    // Call the server-side API route that invokes the Edge Function
    const response = await fetch('/api/sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        entityType: 'artist',
        ticketmasterId,
        spotifyId,
        options,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to sync artist');
    }

    return await response.json();
  } catch (error) {
    console.error('Error syncing artist:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Trigger a sync operation for a show
 */
export async function syncShow(
  showId: string,
  options?: SyncOptions
): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const response = await fetch('/api/sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        entityType: 'show',
        entityId: showId,
        options,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to sync show');
    }

    return await response.json();
  } catch (error) {
    console.error('Error syncing show:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Trigger a sync operation for a venue
 */
export async function syncVenue(
  venueId: string,
  options?: SyncOptions
): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const response = await fetch('/api/sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        entityType: 'venue',
        entityId: venueId,
        options,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to sync venue');
    }

    return await response.json();
  } catch (error) {
    console.error('Error syncing venue:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Poll for the sync status of an artist
 */
export async function pollArtistSyncStatus(
  artistId: string,
  intervalMs = 2000,
  maxAttempts = 60 // 2 minutes maximum polling time
): Promise<{ success: boolean; isComplete: boolean; status?: SyncStatus; error?: string }> {
  try {
    // Query the artist table to get the current sync status
    const { data, error } = await supabase
      .from('artists')
      .select('id, sync_status, last_sync_error')
      .eq('id', artistId)
      .single();

    if (error) {
      throw error;
    }

    if (!data) {
      return {
        success: false,
        isComplete: true,
        error: `Artist with ID ${artistId} not found`,
      };
    }

    const syncStatus: SyncStatus = data.sync_status || {};

    // Determine if the sync is complete (either success or error)
    const isComplete =
      syncStatus.ticketmaster === 'success' ||
      syncStatus.ticketmaster === 'error' ||
      !syncStatus.ticketmaster;

    return {
      success: true,
      isComplete,
      status: syncStatus,
      error: data.last_sync_error,
    };
  } catch (error) {
    console.error('Error polling artist sync status:', error);
    return {
      success: false,
      isComplete: true, // Stop polling on error
      error: error instanceof Error ? error.message : 'Unknown error during status check',
    };
  }
}

/**
 * Poll for the sync status of a show
 */
export async function pollShowSyncStatus(
  showId: string,
  intervalMs = 2000,
  maxAttempts = 30 // 1 minute maximum polling time
): Promise<{ success: boolean; isComplete: boolean; setlistSuggestions?: any[]; error?: string }> {
  try {
    // Query the shows table to get the current sync status
    const { data, error } = await supabase
      .from('shows')
      .select('id, sync_status, setlist_suggestions, last_sync_error')
      .eq('id', showId)
      .single();

    if (error) {
      throw error;
    }

    if (!data) {
      return {
        success: false,
        isComplete: true,
        error: `Show with ID ${showId} not found`,
      };
    }

    // Determine if the sync is complete (status is a string, not an object like artists)
    const isComplete =
      data.sync_status === 'success' ||
      data.sync_status === 'error' ||
      !data.sync_status;

    return {
      success: true,
      isComplete,
      setlistSuggestions: data.setlist_suggestions || [],
      error: data.last_sync_error,
    };
  } catch (error) {
    console.error('Error polling show sync status:', error);
    return {
      success: false,
      isComplete: true, // Stop polling on error
      error: error instanceof Error ? error.message : 'Unknown error during status check',
    };
  }
}

/**
 * Setup polling mechanism to check sync status until complete
 * Returns a cleanup function to cancel polling
 */
export function setupPolling(
  entityType: EntityType,
  entityId: string,
  onStatusUpdate: (status: any) => void,
  onComplete: (finalStatus: any) => void,
  onError: (error: string) => void,
  intervalMs = 2000,
  maxAttempts = 60
): () => void {
  let attempts = 0;
  let timerId: NodeJS.Timeout | null = null;

  // Define the polling function based on entity type
  const poll = async () => {
    attempts++;

    try {
      let result;

      if (entityType === 'artist') {
        result = await pollArtistSyncStatus(entityId, intervalMs, maxAttempts);
      } else if (entityType === 'show') {
        result = await pollShowSyncStatus(entityId, intervalMs, maxAttempts);
      } else {
        // Venues don't have a complex polling mechanism, just check once
        result = { 
          success: true, 
          isComplete: true, 
          status: { message: 'Venue sync requested' } 
        };
      }

      // Call the status update callback
      if (result.success) {
        onStatusUpdate(result);
      } else if (result.error) {
        onError(result.error);
        clearTimeout(timerId!);
        return;
      }

      // Check if we're done or reached max attempts
      if (result.isComplete || attempts >= maxAttempts) {
        clearTimeout(timerId!);
        onComplete(result);
        return;
      }

      // Continue polling
      timerId = setTimeout(poll, intervalMs);
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Unknown error during polling');
      clearTimeout(timerId!);
    }
  };

  // Start polling immediately
  timerId = setTimeout(poll, 0);

  // Return a cleanup function
  return () => {
    if (timerId) {
      clearTimeout(timerId);
    }
  };
}
