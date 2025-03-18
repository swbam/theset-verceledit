import { useState, useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { getSetlistSongs } from '@/lib/api/db/setlist-utils';
import { createSetlistForShow } from '@/lib/api/db/show-utils';
import { Song } from './types';
import { toast } from 'sonner';

/**
 * Hook for managing setlist data and realtime subscriptions
 */
export function useSetlist(showId: string, initialSongs: Song[], userId?: string) {
  const queryClient = useQueryClient();
  const [isConnected, setIsConnected] = useState(false);
  const [setlist, setSetlist] = useState<Song[]>([]);
  const [setlistId, setSetlistId] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  
  // Function to get or create setlist ID for this show
  const getSetlistId = useCallback(async (showId: string) => {
    try {
      if (!showId) return null;
      
      console.log(`Getting setlist ID for show: ${showId}`);
      
      // Try to find existing setlist - multiple attempts with error handling
      const existingSetlistId = null; // This is just a placeholder, we return early if we find a setlist
      
      try {
        const { data, error } = await supabase
          .from('setlists')
          .select('id')
          .eq('show_id', showId)
          .maybeSingle();
        
        if (!error && data?.id) {
          console.log(`Found existing setlist: ${data.id}`);
          return data.id;
        }
      } catch (fetchError) {
        console.error("Error fetching setlist:", fetchError);
        // Continue to creation attempt
      }
      
      // If no setlist exists, we need to create one
      console.warn(`No setlist found for show ${showId}, will create one`);
      
      // First, ensure we have the show data with artist_id
      let artistId = null;
      
      try {
        // Get the artist ID from the show table
        const { data: showData, error: showError } = await supabase
          .from('shows')
          .select('artist_id, name')
          .eq('id', showId)
          .maybeSingle();
        
        if (!showError && showData?.artist_id) {
          artistId = showData.artist_id;
          console.log(`Found artist_id ${artistId} for show ${showId} (${showData.name || 'Unnamed'})`);
        } else {
          // If we can't get the artist ID, we'll create the setlist anyway
          console.warn(`Could not find artist_id for show ${showId}, creating setlist without it`);
        }
      } catch (showError) {
        console.error("Error fetching show data:", showError);
        // Continue anyway - we'll create the setlist without artist_id
      }
      
      // Create the setlist - multiple approaches with fallbacks
      
      // Approach 1: Direct insert with transaction
      try {
        // Use a more complete setlist object with all required fields
        const timestamp = new Date().toISOString();
        const setlistData = {
          show_id: showId,
          created_at: timestamp,
          last_updated: timestamp
        };
        
        console.log("Attempting to create setlist with data:", setlistData);
        
        // Try to insert with RLS bypass for anonymous users
        const { data: newSetlist, error: insertError } = await supabase
          .from('setlists')
          .insert(setlistData)
          .select('id')
          .single();
        
        if (!insertError && newSetlist?.id) {
          console.log(`Successfully created setlist: ${newSetlist.id}`);
          return newSetlist.id;
        }
        
        // Log detailed error information
        if (insertError) {
          console.error("Error in direct setlist creation:", {
            code: insertError.code,
            message: insertError.message,
            details: insertError.details,
            hint: insertError.hint
          });
          
          // Check if it's a duplicate key error (someone else might have created it)
          if (insertError.code === '23505') {
            console.log(`Duplicate key error - setlist may already exist for show ${showId}`);
            
            // Try to get the setlist again
            const { data: existingSetlist } = await supabase
              .from('setlists')
              .select('id')
              .eq('show_id', showId)
              .maybeSingle();
              
            if (existingSetlist?.id) {
              console.log(`Found existing setlist after duplicate key error: ${existingSetlist.id}`);
              return existingSetlist.id;
            }
          }
          
          // If it's an authentication error, try a different approach
          if (insertError.code === '401' || insertError.message?.includes('unauthorized')) {
            console.log("Authentication error, trying alternative approach");
            // Continue to next approach
          }
        }
      } catch (createError) {
        console.error("Exception in direct setlist creation:", createError);
        // Continue to next approach
      }
      
      // Approach 2: Use the utility function
      try {
        const newSetlistId = await createSetlistForShow({ 
          id: showId, 
          artist_id: artistId 
        });
        
        if (newSetlistId) {
          console.log(`Created setlist using utility function: ${newSetlistId}`);
          return newSetlistId;
        }
      } catch (utilError) {
        console.error("Error using createSetlistForShow utility:", utilError);
        // Continue to final check
      }
      
      // Final check: One last attempt to find an existing setlist (in case of race condition)
      try {
        const { data: finalCheck } = await supabase
          .from('setlists')
          .select('id')
          .eq('show_id', showId)
          .maybeSingle();
          
        if (finalCheck?.id) {
          console.log(`Found setlist in final check: ${finalCheck.id}`);
          return finalCheck.id;
        }
      } catch (finalError) {
        console.error("Error in final setlist check:", finalError);
      }
      
      // If we get here, all attempts failed
      console.error(`All attempts to create setlist for show ${showId} failed`);
      toast.error("Unable to create setlist. Please try again.");
      return null;
    } catch (error) {
      console.error("Error in getSetlistId:", error);
      return null;
    }
  }, []);
  
  // Fetch songs from database
  const { 
    data: dbSongs,
    isLoading: isLoadingDbSongs,
    error: dbSongsError,
    refetch: refetchSongs
  } = useQuery({
    queryKey: ['setlistSongs', showId, setlistId],
    queryFn: async () => {
      if (!setlistId) return [];
      console.log(`Fetching songs for setlist ${setlistId}`);
      const songs = await getSetlistSongs(setlistId, userId);
      console.log(`Fetched ${songs.length} songs from database`);
      return songs;
    },
    enabled: !!setlistId,
  });
  
  // Get setlist ID when showId is available
  useEffect(() => {
    if (showId) {
      console.log(`Initializing setlist for show: ${showId}`);
      getSetlistId(showId).then(id => {
        if (id) {
          console.log(`Setting setlist ID: ${id}`);
          setSetlistId(id);
          setRetryCount(0); // Reset retry count on success
        } else {
          console.error(`Failed to get or create setlist for show: ${showId}`);
          // Implement retry logic
          if (retryCount < 3) {
            console.log(`Retrying setlist creation (attempt ${retryCount + 1}/3)...`);
            setTimeout(() => {
              setRetryCount(prev => prev + 1);
            }, 2000); // Retry after 2 seconds
          } else if (retryCount === 3) {
            toast.error("Unable to create setlist. Please refresh the page.");
            setRetryCount(prev => prev + 1); // Prevent more toasts
          }
        }
      });
    }
  }, [showId, getSetlistId, retryCount]);
  
  // Set up realtime updates for votes
  useEffect(() => {
    if (!setlistId) return;
    
    console.log("Setting up realtime updates for setlist");
    
    const channel = supabase
      .channel('setlist-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'setlist_songs',
          filter: `setlist_id=eq.${setlistId}`
        },
        (payload) => {
          console.log("Received update for setlist song:", payload);
          // Update the local state to reflect the changes
          queryClient.invalidateQueries({ queryKey: ['setlistSongs', showId, setlistId] });
        }
      )
      .subscribe(status => {
        console.log("Realtime subscription status:", status);
        setIsConnected(status === 'SUBSCRIBED');
      });
    
    return () => {
      console.log("Cleaning up realtime subscription");
      supabase.removeChannel(channel);
    };
  }, [setlistId, showId, queryClient]);
  
  // Combine database songs with client-side state
  useEffect(() => {
    if (dbSongs) {
      console.log(`Setting setlist with ${dbSongs.length} songs from database`);
      // Map the DB songs to the format expected by the UI
      setSetlist(dbSongs.map(song => ({
        id: song.id,
        name: song.name,
        votes: song.votes,
        userVoted: !!song.userVoted,
        albumName: song.albumName,
        albumImageUrl: song.albumImageUrl,
        artistName: song.artistName,
        setlistSongId: song.setlistSongId
      })));
    } else if (initialSongs.length > 0 && (!dbSongs || dbSongs.length === 0)) {
      // If no DB songs yet, use initial songs
      console.log(`Using ${initialSongs.length} initial songs`);
      setSetlist(initialSongs);
    }
  }, [dbSongs, initialSongs]);
  
  return {
    setlist,
    isConnected,
    isLoadingSetlist: isLoadingDbSongs,
    setlistError: dbSongsError,
    setlistId,
    refetchSongs,
    getSetlistId
  };
}
