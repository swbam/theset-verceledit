
import { useQuery } from '@tanstack/react-query';
import { getArtistTopTracks } from '@/lib/spotify';
import { generateMockTracks } from './utils';
import { SpotifyTrack } from '@/lib/spotify/types';

// Fetch top tracks query
export function useTopTracks(spotifyArtistId: string, isLoadingShow: boolean) {
  return useQuery({
    queryKey: ['artistTopTracks', spotifyArtistId],
    queryFn: async () => {
      console.log(`Fetching top tracks for artist ID: ${spotifyArtistId}`);
      if (!spotifyArtistId) {
        console.error("No valid Spotify artist ID available");
        return { tracks: generateMockTracks(10) };
      }
      
      try {
        // Directly call our top tracks API function
        const tracksResponse = await getArtistTopTracks(spotifyArtistId, 10);
        console.log(`Fetched top tracks result`, tracksResponse);
        
        // Handle both response formats - array or object with tracks property
        if (Array.isArray(tracksResponse)) {
          console.log(`Received array of ${tracksResponse.length} tracks`);
          return { tracks: tracksResponse };
        }
        
        // If we have tracks in the object format, return them
        if (tracksResponse.tracks && tracksResponse.tracks.length > 0) {
          console.log(`Received ${tracksResponse.tracks.length} tracks in object format`);
          return tracksResponse;
        }
        
        // Otherwise return mock data
        console.log("No tracks returned from getArtistTopTracks, using mock data");
        return { tracks: generateMockTracks(10) };
      } catch (error) {
        console.error("Error fetching tracks:", error);
        return { tracks: generateMockTracks(10) };
      }
    },
    enabled: !!spotifyArtistId && !isLoadingShow,
    retry: 3,
    staleTime: 1000 * 60 * 30, // 30 minutes
  });
}
