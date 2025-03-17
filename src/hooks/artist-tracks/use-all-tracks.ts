
import { useQuery } from '@tanstack/react-query';
import { getArtistAllTracks } from '@/lib/spotify';
import { generateMockTracks } from './utils';
import { getStoredTracksFromDb } from '@/lib/spotify/utils';
import { SpotifyTrack } from '@/lib/spotify/types';

// Fetch all tracks query - prioritize cached data
export function useAllTracks(spotifyArtistId: string, isLoadingShow: boolean) {
  return useQuery({
    queryKey: ['artistAllTracks', spotifyArtistId],
    queryFn: async () => {
      if (!spotifyArtistId) {
        console.error("No valid Spotify artist ID available");
        return { tracks: generateMockTracks(20) };
      }
      
      console.log(`Fetching all tracks for artist ID: ${spotifyArtistId}`);
      
      try {
        // Directly fetch from database or API with one consolidated function
        const tracksResponse = await getArtistAllTracks(spotifyArtistId);
        console.log(`Fetched all tracks result:`, tracksResponse);
        
        if (tracksResponse && tracksResponse.tracks && tracksResponse.tracks.length > 0) {
          console.log(`Fetched ${tracksResponse.tracks.length} tracks in total`);
          return tracksResponse;
        }
        
        // If we still don't have tracks, return mock data
        console.log("No tracks returned from getArtistAllTracks, using mock data");
        return { tracks: generateMockTracks(20) };
      } catch (error) {
        console.error("Error fetching all tracks:", error);
        return { tracks: generateMockTracks(20) };
      }
    },
    enabled: !!spotifyArtistId && !isLoadingShow,
    retry: 2,
    staleTime: 1000 * 60 * 60, // 1 hour - keep data fresh for longer
  });
}
