
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { getArtistAllTracks } from '@/lib/spotify';
import { getStoredTracksForArtist, updateArtistStoredTracks, fetchAndStoreArtistTracks } from '@/lib/api/database';

export function useArtistTracks(artistId: string | undefined, spotifyArtistId: string | undefined) {
  return useQuery({
    queryKey: ['artistTracks', artistId, spotifyArtistId],
    queryFn: async () => {
      if (!artistId && !spotifyArtistId) {
        throw new Error('Artist ID or Spotify Artist ID is required');
      }

      try {
        // First check if we have stored tracks for this artist
        if (artistId) {
          console.log(`Checking for stored tracks for artist ${artistId}`);
          const storedTracks = await getStoredTracksForArtist(artistId);
          
          if (storedTracks && storedTracks.length > 0) {
            console.log(`Using ${storedTracks.length} stored tracks for artist ${artistId}`);
            return { tracks: storedTracks };
          }
        }
        
        // If no stored tracks but we have a Spotify ID, fetch from Spotify
        if (spotifyArtistId) {
          console.log(`Fetching tracks from Spotify for artist ID: ${spotifyArtistId}`);
          
          if (artistId) {
            // Use the dedicated function that stores tracks and handles errors
            const tracks = await fetchAndStoreArtistTracks(artistId, spotifyArtistId, "Unknown Artist");
            if (tracks && tracks.length > 0) {
              return { tracks };
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
          
          return result;
        }
        
        throw new Error('No stored tracks and no Spotify Artist ID available');
      } catch (error) {
        console.error("Error in useArtistTracks:", error);
        toast.error("Failed to load artist tracks");
        return { tracks: [] };
      }
    },
    enabled: !!(artistId || spotifyArtistId),
    staleTime: 1000 * 60 * 60, // 1 hour - tracks don't change often
  });
}
