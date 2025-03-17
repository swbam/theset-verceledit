
import { useQuery } from '@tanstack/react-query';
import { getStoredTracksFromDb, convertStoredTracks } from '@/lib/spotify';

export function useStoredTracks(artistId: string) {
  return useQuery({
    queryKey: ['storedTracks', artistId],
    queryFn: async () => {
      if (!artistId) return { tracks: [] };
      
      const tracks = await getStoredTracksFromDb(artistId);
      if (tracks && tracks.length > 0) {
        console.log(`Using ${tracks.length} stored tracks from database`);
        return convertStoredTracks(tracks);
      }
      
      return { tracks: [] };
    },
    enabled: !!artistId,
    staleTime: 1000 * 60 * 10, // 10 minutes
  });
}

// Add this function for backwards compatibility
export function useStoredArtistData(artistId: string, isLoading: boolean) {
  return useQuery({
    queryKey: ['storedArtistData', artistId],
    queryFn: async () => {
      return { data: {} };
    },
    enabled: !!artistId && !isLoading
  });
}
