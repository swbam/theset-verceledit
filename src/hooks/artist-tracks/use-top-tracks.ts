
import { useQuery } from '@tanstack/react-query';
import { getArtistTopTracks, SpotifyTrack } from '@/lib/spotify';
import { generateMockTracks } from './utils';

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
        const tracks = await getArtistTopTracks(spotifyArtistId, 10);
        console.log(`Fetched ${tracks.tracks?.length || 0} top tracks`);
        
        // If we still don't have tracks, return mock data
        if (!tracks.tracks || tracks.tracks.length === 0) {
          console.log("No tracks returned from getArtistTopTracks, using mock data");
          return { tracks: generateMockTracks(5) };
        }
        
        return tracks;
      } catch (error) {
        console.error("Error fetching tracks:", error);
        return { tracks: generateMockTracks(5) };
      }
    },
    enabled: !!spotifyArtistId && !isLoadingShow,
    retry: 2,
  });
}
