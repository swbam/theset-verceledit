
import { useQuery } from '@tanstack/react-query';
import { useCallback } from 'react'; // Import useCallback
import { supabase } from '@/integrations/supabase/client'; // Import supabase client
import { Song } from '@/lib/types'; // Import Song type
// Import SyncManager - assuming singleton or instantiate locally
import { SyncManager } from '@/lib/sync/manager';
const syncManager = new SyncManager();

export function useArtistTracks(
  artistId: string | undefined,
  spotifyArtistId: string | undefined,
  // spotifyArtistId is no longer needed as primary input, sync service handles lookup
  _spotifyArtistId_unused?: string | undefined,
  options: { immediate?: boolean } = { immediate: true } // Removed prioritizeStored
) {
  const {
    data, // This will now be { songs: Song[] }
    isLoading,
    error,
    isError,
    refetch
  } = useQuery({
    // Use only artistId (internal UUID) as the key now
    queryKey: ['artistTracks', artistId],
    queryFn: async (): Promise<{ songs: Song[] }> => { // Return type simplified
      if (!artistId) {
        // If no artistId, we can't fetch songs
        console.log("useArtistTracks: No artistId provided.");
        return { songs: [] };
      }

      console.log(`useArtistTracks: Fetching songs for artist ${artistId} from DB`);
      const { data: songs, error } = await supabase
        .from('songs')
        .select('*')
        .eq('artist_id', artistId)
        .order('popularity', { ascending: false, nullsFirst: false }) // Order by popularity
        .limit(100); // Limit number of songs fetched

      if (error) {
        console.error(`useArtistTracks: Error fetching songs for artist ${artistId}:`, error);
        // Don't throw, return empty array, sync might fix it
        return { songs: [] };
      }

      if (!songs || songs.length === 0) {
        console.log(`useArtistTracks: No songs found in DB for artist ${artistId}. Triggering background sync.`);
        // Trigger background sync to fetch songs if none are found
        syncManager.enqueueTask({
          type: 'artist', // Syncing the artist should fetch/update their songs
          id: artistId,   // Use internal artist ID
          operation: 'refresh', // Refresh the artist data, including tracks
          priority: 'medium'
        }).catch(err => console.error("Failed to queue artist refresh task:", err));
        return { songs: [] }; // Return empty while sync runs
      }

      console.log(`useArtistTracks: Found ${songs.length} songs in DB for artist ${artistId}`);
      return { songs: songs as Song[] }; // Return songs found in DB
    },
    enabled: !!artistId && options.immediate !== false, // Enable only if artistId is present
    staleTime: 1000 * 60 * 30, // 30 minutes staleTime
    gcTime: 1000 * 60 * 60,   // 1 hour gcTime
  });

  // Adapt the return value based on the new queryFn structure
  const songs = data?.songs || [];
  const initialSongs = songs.slice(0, 10); // Top 10 by popularity
  const storedTracksData = songs; // All fetched songs are "stored"

  // Helper function to filter out songs already in a setlist
  const getAvailableTracks = useCallback((setlist: { id: string }[]) => {
    const setlistIds = new Set((setlist || []).map(song => song.id));
    // Ensure track.id exists before checking the Set
    return songs.filter((track: Song) => track.id && !setlistIds.has(track.id));
  }, [songs]);

  return {
    tracks: songs, // Keep 'tracks' for compatibility if needed, but it's the same as 'songs'
    initialSongs,
    storedTracksData,
    getAvailableTracks,
    isLoading,
    error,
    isError,
    refetch
  };
}
