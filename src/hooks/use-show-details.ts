
import { useQuery } from '@tanstack/react-query';
import { useState, useEffect, useCallback } from 'react';
import { fetchShowDetails } from '@/lib/ticketmaster';
import { searchArtists } from '@/lib/spotify';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

export function useShowDetails(id: string | undefined) {
  const [spotifyArtistId, setSpotifyArtistId] = useState<string>('');
  
  // Memoize the checkShowInDatabase function to prevent recreating it on each render
  const checkShowInDatabase = useCallback(async (showId: string) => {
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
        // Only log database permission errors, don't show to user
        if (error.code === '42501') {
          console.log("Database permission error (expected):", error.message);
        } else {
          console.log("Database check error:", error.message);
        }
        return null;
      }
      
      return data;
    } catch (err) {
      console.error("Error checking show in database:", err);
      return null;
    }
  }, []);
  
  // Optimize the Spotify artist ID search
  const findSpotifyArtistId = useCallback(async (artistName: string) => {
    if (!artistName) return 'mock-artist';
    
    try {
      // Check localStorage cache first to avoid unnecessary API calls
      const cachedId = localStorage.getItem(`spotify_artist_${artistName}`);
      if (cachedId) {
        console.log(`Using cached Spotify ID for ${artistName}: ${cachedId}`);
        return cachedId;
      }
      
      const artistResult = await searchArtists(artistName, 1);
      if (artistResult?.artists?.items && artistResult.artists.items.length > 0) {
        const spotifyId = artistResult.artists.items[0].id;
        console.log(`Set Spotify artist ID from search: ${spotifyId}`);
        
        // Cache the result
        localStorage.setItem(`spotify_artist_${artistName}`, spotifyId);
        return spotifyId;
      } else {
        console.log("No Spotify artist found with name:", artistName);
        return 'mock-artist';
      }
    } catch (error) {
      console.error("Error searching for artist by name:", error);
      return 'mock-artist';
    }
  }, []);
  
  const { 
    data: show, 
    isLoading: isLoadingShow,
    error: showError,
    isError
  } = useQuery({
    queryKey: ['show', id],
    queryFn: async () => {
      if (!id) throw new Error("Show ID is required");
      
      // First check if show exists in database
      const dbShow = await checkShowInDatabase(id);
      
      // Whether or not show was in database, fetch fresh details
      const showDetails = await fetchShowDetails(id);
      
      // Find and set Spotify artist ID if we have an artist name
      if (showDetails?.artist?.name) {
        const spotifyId = await findSpotifyArtistId(showDetails.artist.name);
        setSpotifyArtistId(spotifyId);
      } else {
        setSpotifyArtistId('mock-artist');
      }
      
      return showDetails;
    },
    enabled: !!id,
    retry: 1,
    retryDelay: 1000,
    staleTime: 1000 * 60 * 15, // 15 minutes
    gcTime: 1000 * 60 * 60, // 1 hour - replaced cacheTime with gcTime
    refetchOnWindowFocus: false,
    meta: {
      onError: (error: any) => {
        console.error("Show details query error:", error);
      }
    }
  });

  return {
    show,
    isLoadingShow,
    showError,
    isError,
    spotifyArtistId
  };
}
