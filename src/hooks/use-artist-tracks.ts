
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { getArtistAllTracks } from '@/lib/spotify';
import { getStoredTracksForArtist, updateArtistStoredTracks, fetchAndStoreArtistTracks } from '@/lib/api/database';

export function useArtistTracks(
  artistId: string | undefined, 
  spotifyArtistId: string | undefined,
  options: { immediate?: boolean } = { immediate: true }
) {
  const { 
    data,
    isLoading,
    error,
    isError
  } = useQuery({
    queryKey: ['artistTracks', artistId, spotifyArtistId],
    queryFn: async () => {
      if (!artistId && !spotifyArtistId) {
        throw new Error('Artist ID or Spotify Artist ID is required');
      }

      try {
        // First check if we have stored tracks for this artist
        if (artistId) {
          const storedTracks = await getStoredTracksForArtist(artistId);
          
          if (storedTracks && storedTracks.length > 0) {
            return { 
              tracks: storedTracks,
              initialSongs: storedTracks.slice(0, 10), // Only return top 10 for initial setlist
              storedTracksData: storedTracks,
              getAvailableTracks: (setlist: any[]) => {
                const setlistIds = new Set(setlist.map(song => song.id));
                return storedTracks.filter((track: any) => !setlistIds.has(track.id));
              }
            };
          }
        }
        
        // If no stored tracks but we have a Spotify ID, fetch from Spotify
        if (spotifyArtistId) {
          if (artistId) {
            // Use the dedicated function that stores tracks and handles errors
            const tracks = await fetchAndStoreArtistTracks(artistId, spotifyArtistId, "Unknown Artist");
            if (tracks && tracks.length > 0) {
              return { 
                tracks,
                initialSongs: tracks.slice(0, 10), // Only use top 10 tracks initially
                storedTracksData: tracks,
                getAvailableTracks: (setlist: any[]) => {
                  const setlistIds = new Set(setlist.map(song => song.id));
                  return tracks.filter((track: any) => !setlistIds.has(track.id));
                }
              };
            }
          }
          
          // If we don't have artistId or the above failed, fetch directly
          const result = await getArtistAllTracks(spotifyArtistId);
          
          // If we have the Ticketmaster artist ID, update the stored tracks in the background
          if (artistId && result.tracks && result.tracks.length > 0) {
            // Don't await this - let it run in the background
            updateArtistStoredTracks(artistId, result.tracks)
              .catch(err => console.error("Background track storage error:", err));
          }
          
          return {
            ...result,
            initialSongs: result.tracks.slice(0, 10), // Only use top 10 tracks initially
            isLoadingTracks: false,
            isLoadingAllTracks: false,
            allTracksData: result,
            storedTracksData: result.tracks,
            getAvailableTracks: (setlist: any[]) => {
              const setlistIds = new Set(setlist.map(song => song.id));
              return result.tracks.filter((track: any) => !setlistIds.has(track.id));
            }
          };
        }
        
        return { 
          tracks: [],
          initialSongs: [],
          isLoadingTracks: false,
          isLoadingAllTracks: false,
          allTracksData: { tracks: [] },
          storedTracksData: [],
          getAvailableTracks: () => []
        };
      } catch (error) {
        console.error("Error in useArtistTracks:", error);
        return { 
          tracks: [],
          initialSongs: [],
          isLoadingTracks: false,
          isLoadingAllTracks: false,
          allTracksData: { tracks: [] },
          storedTracksData: [],
          getAvailableTracks: () => []
        };
      }
    },
    enabled: !!(artistId || spotifyArtistId) && options.immediate !== false,
    staleTime: 1000 * 60 * 60, // 1 hour - tracks don't change often
    gcTime: 1000 * 60 * 120,   // 2 hours
  });

  return {
    ...data,
    isLoading,
    error,
    isError
  };
}
