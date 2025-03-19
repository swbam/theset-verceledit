
import { useQuery } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { fetchShowDetails } from '@/lib/ticketmaster';
import { searchArtists } from '@/lib/spotify';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

export function useShowDetails(id: string | undefined) {
  const [spotifyArtistId, setSpotifyArtistId] = useState<string>('');
  
  // Check if show exists in database first
  const checkShowInDatabase = async (showId: string) => {
    try {
      const { data, error } = await supabase
        .from('shows')
        .select(`
          id, 
          name, 
          date, 
          artist_id,
          venue_id,
          ticket_url,
          image_url
        `)
        .eq('id', showId)
        .maybeSingle();
      
      if (error) {
        console.log("Database check error:", error.message);
        return null;
      }
      
      return data;
    } catch (err) {
      console.error("Error checking show in database:", err);
      return null;
    }
  };
  
  const { 
    data: show, 
    isLoading: isLoadingShow,
    error: showError,
    isError
  } = useQuery({
    queryKey: ['show', id],
    queryFn: async () => {
      console.log("Starting show details query for ID:", id);
      
      try {
        if (!id) throw new Error("Show ID is required");
        
        // First check if show exists in database
        const dbShow = await checkShowInDatabase(id);
        if (dbShow) {
          console.log("Found show in database:", dbShow);
        }
        
        // Whether or not show was in database, fetch fresh details
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
        } else {
          console.log("No artist name found in show details");
          setSpotifyArtistId('mock-artist');
        }
        
        return showDetails;
      } catch (error) {
        console.error("Error fetching show details:", error);
        throw error;
      }
    },
    enabled: !!id,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
    onError: (error) => {
      console.error("Show details query error:", error);
      toast.error("Could not load show details. Please try again.");
    }
  });

  // Effect to log current state for debugging
  useEffect(() => {
    console.log("Show details hook state:", {
      showId: id,
      isLoading: isLoadingShow,
      hasError: isError,
      spotifyArtistId,
      showData: show ? "Available" : "Not available"
    });
  }, [id, isLoadingShow, isError, spotifyArtistId, show]);

  return {
    show,
    isLoadingShow,
    showError,
    isError,
    spotifyArtistId
  };
}
