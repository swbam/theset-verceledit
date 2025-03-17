
import { useQuery } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
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
        
        return showDetails;
      } catch (error) {
        console.error("Error fetching show details:", error);
        throw error;
      }
    },
    enabled: !!id,
    retry: 1,
  });
  
  // Use an effect to search for the Spotify artist ID when show data is available
  useEffect(() => {
    const fetchSpotifyArtistId = async () => {
      if (show?.artist?.name) {
        try {
          console.log("Searching for artist on Spotify:", show.artist.name);
          const artistResult = await searchArtists(show.artist.name, 1);
          
          if (artistResult?.artists?.items && artistResult.artists.items.length > 0) {
            const spotifyId = artistResult.artists.items[0].id;
            console.log(`Found Spotify artist ID: ${spotifyId} for ${show.artist.name}`);
            setSpotifyArtistId(spotifyId);
          } else {
            console.log("No Spotify artist found with name:", show.artist.name);
            // Set mock ID to allow for mock data fallback
            setSpotifyArtistId('mock-artist');
          }
        } catch (error) {
          console.error("Error searching for artist by name:", error);
          // Set mock ID to allow for mock data fallback
          setSpotifyArtistId('mock-artist');
        }
      }
    };
    
    if (show && !spotifyArtistId) {
      fetchSpotifyArtistId();
    }
  }, [show, spotifyArtistId]);

  return {
    show,
    isLoadingShow,
    showError,
    isError,
    spotifyArtistId
  };
}
