
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { fetchShowDetails } from '@/lib/ticketmaster';
import { searchArtists } from '@/lib/spotify';

export function useShowDetails(id: string | undefined) {
  const [spotifyArtistId, setSpotifyArtistId] = useState<string>('');
  
  const { 
    data: show, 
    isLoading: isLoadingShow,
    error: showError,
    isError
  } = useQuery({
    queryKey: ['show', id],
    queryFn: async () => {
      try {
        if (!id) throw new Error("Show ID is required");
        
        const showDetails = await fetchShowDetails(id);
        console.log("Show details fetched:", showDetails);
        
        // Fix for Spotify artist ID - search by name instead of using Ticketmaster ID
        if (showDetails?.artist?.name) {
          try {
            const artistResult = await searchArtists(showDetails.artist.name, 1);
            if (artistResult?.artists?.items && artistResult.artists.items.length > 0) {
              const spotifyId = artistResult.artists.items[0].id;
              setSpotifyArtistId(spotifyId);
              console.log(`Set Spotify artist ID from search: ${spotifyId}`);
            } else {
              console.log("No Spotify artist found with name:", showDetails.artist.name);
              // Set mock ID to allow for mock data fallback
              setSpotifyArtistId('mock-artist');
            }
          } catch (error) {
            console.error("Error searching for artist by name:", error);
            // Set mock ID to allow for mock data fallback
            setSpotifyArtistId('mock-artist');
          }
        }
        
        return showDetails;
      } catch (error) {
        console.error("Error fetching show details:", error);
        throw error;
      }
    },
    enabled: !!id,
    retry: 1,
  });

  return {
    show,
    isLoadingShow,
    showError,
    isError,
    spotifyArtistId
  };
}
