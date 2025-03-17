
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
        return { tracks: generateMockTracks(5) };
      }
      
      try {
        // Directly call our top tracks API function, requesting 10 instead of 5
        // to have more options if some tracks don't have all the required data
        const tracksResponse = await getArtistTopTracks(spotifyArtistId, 10);
        console.log(`Fetched top tracks result:`, tracksResponse);
        
        // We should always get an object with tracks property
        if (tracksResponse && tracksResponse.tracks && tracksResponse.tracks.length > 0) {
          console.log(`Received ${tracksResponse.tracks.length} tracks`);
          
          // Return tracks sorted by popularity to ensure we get true top tracks
          const sortedTracks = [...tracksResponse.tracks]
            .filter(track => track && track.name) // Filter out invalid tracks
            .sort((a, b) => (b.popularity || 0) - (a.popularity || 0)); // Sort by popularity
          
          // Return the top 5 tracks
          return { tracks: sortedTracks.slice(0, 5) };
        }
        
        // Otherwise return mock data
        console.log("No tracks returned from getArtistTopTracks, using mock data");
        return { tracks: generateMockTracks(5) };
      } catch (error) {
        console.error("Error fetching tracks:", error);
        return { tracks: generateMockTracks(5) };
      }
    },
    enabled: !!spotifyArtistId && !isLoadingShow,
    retry: 3,
    staleTime: 1000 * 60 * 30, // 30 minutes
  });
}
