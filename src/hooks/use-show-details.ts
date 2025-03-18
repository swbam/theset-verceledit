
import { useQuery } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { fetchShowDetails } from '@/lib/ticketmaster';
import { searchArtists } from '@/lib/spotify';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

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
        toast.error("Failed to load show details");
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
          
          // First, check if the artist already has a spotify_id in our database
          if (show.artist.spotify_id) {
            console.log(`Artist already has Spotify ID in database: ${show.artist.spotify_id}`);
            setSpotifyArtistId(show.artist.spotify_id);
            return;
          }
          
          // If not, search Spotify for the artist
          const artistResult = await searchArtists(show.artist.name, 1);
          
          if (artistResult?.artists?.items && artistResult.artists.items.length > 0) {
            const spotifyId = artistResult.artists.items[0].id;
            console.log(`Found Spotify artist ID: ${spotifyId} for ${show.artist.name}`);
            
            // Update the artist in the database with the Spotify ID
            try {
              const { error: updateError } = await supabase
                .from('artists')
                .update({ spotify_id: spotifyId })
                .eq('id', show.artist.id);
                
              if (updateError) {
                console.error("Error updating artist with Spotify ID:", updateError);
              } else {
                console.log(`Updated artist ${show.artist.id} with Spotify ID ${spotifyId}`);
              }
            } catch (updateError) {
              console.error("Error updating artist with Spotify ID:", updateError);
            }
            
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
          toast.error("Could not find artist on Spotify, using sample tracks");
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
