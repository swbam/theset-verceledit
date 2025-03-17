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
        // First check if stored data is already available
        const storedTracks = await getStoredTracksFromDb(spotifyArtistId);
        if (storedTracks && storedTracks.length > 10) {
          console.log(`Using ${storedTracks.length} cached tracks from database`);
          return { tracks: storedTracks as SpotifyTrack[] };
        }
        
        // Otherwise fetch from Spotify API (this will also store the tracks in DB)
        const tracksResponse = await getArtistAllTracks(spotifyArtistId);
        const tracks = tracksResponse.tracks;
        
        console.log(`Fetched ${Array.isArray(tracks) ? tracks.length : 0} tracks in total`);
        
        // If we still don't have tracks, return mock data
        if (!tracks || (Array.isArray(tracks) && tracks.length === 0)) {
          console.log("No tracks returned from getArtistAllTracks, using mock data");
          return { tracks: generateMockTracks(20) };
        }
        
        return { tracks: tracks as SpotifyTrack[] };
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
