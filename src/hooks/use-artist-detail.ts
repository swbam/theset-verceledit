import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useDocumentTitle } from '@/hooks/use-document-title';
import { ArtistWithEvents, Show } from '@/lib/types'; // Removed unused StoredSong
import { fetchArtistById } from '@/lib/api/artist';
import { fetchArtistEvents } from '@/lib/ticketmaster'; // Assuming this is correct, not ticketmaster-config
import { useEffect, useCallback, useState } from 'react'; // Added useState
import { toast } from 'sonner';
// Removed unused supabase client import

interface UseArtistDetailReturn {
  artist: ArtistWithEvents | null | undefined;
  shows: Show[];
  loading: {
    artist: boolean;
    shows: boolean;
    sync: boolean;
  };
  error: {
    artist: Error | null;
    shows: Error | null;
    sync: Error | null;
  };
  refetch: () => Promise<void>;
}

export function useArtistDetail(id: string | undefined): UseArtistDetailReturn {
  const queryClient = useQueryClient();
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<Error | null>(null);

  const {
    data: artist,
    isLoading: artistLoading,
    error: artistError,
    refetch: refetchArtist
  } = useQuery({
    queryKey: ['artist', id],
    queryFn: async () => {
      if (!id) throw new Error('Artist ID is required');
      try {
        console.log(`[useArtistDetail] Fetching artist data for ID: ${id}`);
        const artistData = await fetchArtistById(id);
        if (!artistData) {
          throw new Error(`Artist not found with ID: ${id}`);
        }
        return artistData;
      } catch (error) {
        console.error("[useArtistDetail] Error fetching artist:", error);
        throw error; // Re-throw for react-query error handling
      }
    },
    enabled: !!id,
    staleTime: 1000 * 60 * 60, // 60 minutes
    retry: 2
  });

  const {
    data: shows = [],
    isLoading: showsLoading,
    error: showsError,
    refetch: refetchShows
  } = useQuery<Show[]>({
    queryKey: ['artistEvents', id],
    queryFn: async () => {
      if (!id) throw new Error('Artist ID is required');
      // Use artist's ticketmaster_id if available for fetching events
      const tmArtistId = artist?.ticketmaster_id;
      if (!tmArtistId) {
        console.warn(`[useArtistDetail] Cannot fetch shows for artist ${id} without Ticketmaster ID.`);
        return []; // Return empty if no TM ID
      }
      try {
        console.log(`[useArtistDetail] Fetching shows for artist TM ID: ${tmArtistId}`);
        // Assuming fetchArtistEvents uses the Ticketmaster ID
        const events = await fetchArtistEvents(tmArtistId);
        console.log(`[useArtistDetail] Found ${events.length} shows for artist TM ID: ${tmArtistId}`);
        return events;
      } catch (error) {
        console.error("[useArtistDetail] Error fetching shows:", error);
        return []; // Return empty on error
      }
    },
    enabled: !!id && !!artist?.ticketmaster_id, // Enable only when artist and TM ID are loaded
    staleTime: 1000 * 60 * 10, // 10 minutes
    retry: 2
  });

  useDocumentTitle(
    artist?.name || 'Artist',
    artist?.name ? `View upcoming concerts and vote on setlists for ${artist.name}` : undefined
  );

  // useCallback for the sync function
  const syncArtist = useCallback(async () => {
    if (!artist?.id) {
      console.log('[useArtistDetail] Cannot sync, artist ID is missing.');
      return;
    }

    // Check if we need to sync based on last sync time or error status
    const lastSync = artist.last_sync ? new Date(artist.last_sync) : null;
    const syncThreshold = 1000 * 60 * 60; // 1 hour
    const needsSync = !lastSync || (Date.now() - lastSync.getTime() > syncThreshold) || artist.sync_status?.ticketmaster === 'error' || artist.sync_status?.spotify === 'error';

    if (!needsSync && artist.sync_status?.ticketmaster === 'success') {
      console.log(`[useArtistDetail] Skipping sync for ${artist.name} - recently synced successfully.`);
      return;
    }

    console.log(`[useArtistDetail] Starting sync for artist ${artist.name} (${artist.id})`);
    setIsSyncing(true);
    setSyncError(null);

    try {
      const response = await fetch('/api/artists/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          entityType: 'artist',
          entityId: artist.id,
          ticketmasterId: artist.ticketmaster_id,
          spotifyId: artist.spotify_id,
          options: {
            skipDependencies: false,
            forceRefresh: artist.sync_status?.ticketmaster === 'error' || artist.sync_status?.spotify === 'error'
          }
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        const error = new Error(data.error || `API Error: ${response.status}`);
        console.error(`[useArtistDetail] Error syncing artist ${artist.name} via API:`, error, data);
        toast.error(`Failed to sync artist data: ${error.message}`);
        setSyncError(error);
        // Don't re-throw, allow component to handle error state
        return;
      }

      if (!data?.success) {
        const syncApiError = new Error(data?.error || 'Unknown sync error from API');
        console.warn(`[useArtistDetail] Artist sync failed for ${artist.name} via API:`, syncApiError);
        toast.error(`Failed to sync artist data: ${data?.error || 'Unknown error'}`);
        setSyncError(syncApiError);
        // Don't re-throw
        return;
      }

      console.log(`[useArtistDetail] Successfully synced artist ${artist.name} via API:`, data);

      // Show success notifications
      if (data.showsCount > 0) {
        toast.success(`Synced ${data.showsCount} shows for ${artist.name}`);
      }
      if (data.songsCount > 0) {
        toast.success(`Synced ${data.songsCount} songs for ${artist.name}`);
      }
      if (data.showsCount === 0 && data.songsCount === 0) {
         toast.info(`Sync complete for ${artist.name}. No new shows or songs found.`);
      }

      // Invalidate queries to refetch fresh data *after* successful sync
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['artist', artist.id] }),
        queryClient.invalidateQueries({ queryKey: ['artistEvents', artist.id] })
      ]);

    } catch (error) {
      // Catch network errors from fetch or JSON parsing errors
      const networkError = error instanceof Error ? error : new Error('Unknown network error');
      console.error(`[useArtistDetail] Network/Fetch error syncing artist ${artist.name}:`, networkError);
      toast.error(`Network error while syncing artist data`);
      setSyncError(networkError);
      // Don't re-throw
    } finally {
      setIsSyncing(false);
    }
  }, [artist, queryClient]); // Dependency array for useCallback

  // Effect to trigger sync when artist data is loaded
  useEffect(() => {
    if (artist?.id) {
      syncArtist().catch(error => {
        // Errors are handled within syncArtist, but log if something unexpected escapes
        console.error(`[useArtistDetail] Uncaught error in sync effect:`, error);
      });
    }
  }, [artist?.id, syncArtist]); // Dependencies for useEffect

  // useCallback for the manual refetch function
  const refetch = useCallback(async () => {
    try {
      // Optionally trigger sync again on manual refetch, or rely on timed sync
      // if (artist?.id) {
      //   await syncArtist(); // Consider if manual refetch should always force sync
      // }
      await Promise.all([
        refetchArtist(),
        refetchShows()
      ]);
      toast.success('Artist data refreshed');
    } catch (error) {
      console.error('[useArtistDetail] Error refetching data:', error);
      toast.error('Failed to refresh artist data');
    }
  }, [refetchArtist, refetchShows]); // Dependencies for useCallback

  return {
    artist,
    shows,
    loading: {
      artist: artistLoading,
      shows: showsLoading,
      sync: isSyncing
    },
    error: {
      artist: artistError,
      shows: showsError,
      sync: syncError
    },
    refetch
  };
}
