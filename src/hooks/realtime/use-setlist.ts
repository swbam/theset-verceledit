import { useState, useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { getSetlistSongs, addTracksToSetlist } from '@/lib/api/db/setlist-utils';
import { createSetlistForShow } from '@/lib/api/db/show-utils';
import { getRandomArtistSongs } from '@/lib/api/db/artist-utils';
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
      try {
        const { data, error } = await supabase
          .from('setlists')
          .select('id')
          .eq('show_id', showId)
          .maybeSingle();
        
        if (!error && data?.id) {
          console.log(`Found existing setlist: ${data.id}`);
          
          // Check if this setlist has songs
          const { data: songsData, error: songsError } = await supabase
            .from('setlist_songs')
            .select('id')
            .eq('setlist_id', data.id)
            .limit(1);
            
          if (!songsError && songsData && songsData.length === 0) {
            console.log(`Setlist ${data.id} exists but has no songs. Will populate with random songs.`);
            
            // Get the artist ID from the show
            const { data: showData } = await supabase
              .from('shows')
              .select('artist_id')
              .eq('id', showId)
              .single();
              
            if (showData?.artist_id) {
              // Add random songs to the empty setlist
              await populateSetlistWithRandomSongs(data.id, showData.artist_id);
            }
          }
          
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
        
        // Always attempt to populate the setlist with random songs if we have an artist ID
        if (artistId) {
          await populateSetlistWithRandomSongs(newSetlist.id, artistId);
        }
        
        return newSetlist.id;
      }
      
      if (insertError) {
        console.error("Error inserting setlist:", insertError);
        
        // Final check: One last attempt to find an existing setlist (in case of race condition)
        const { data: finalCheck } = await supabase
          .from('setlists')
          .select('id')
          .eq('show_id', showId)
          .maybeSingle();
          
        if (finalCheck?.id) {
          console.log(`Found setlist in final check: ${finalCheck.id}`);
          return finalCheck.id;
        }
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
  
  // Helper function to populate a setlist with random songs
  const populateSetlistWithRandomSongs = async (setlistId: string, artistId: string) => {
    try {
      console.log(`Populating setlist ${setlistId} with random songs from artist ${artistId}`);
      
      // First, try to get songs from the artist_songs table
      const { data: artistSongs, error: songsError } = await supabase
        .from('artist_songs')
        .select('id, name')
        .eq('artist_id', artistId)
        .order('popularity', { ascending: false })
        .limit(50); // Get a good selection of songs to pick from
      
      let randomSongs = [];
      
      if (!songsError && artistSongs && artistSongs.length >= 5) {
        // Shuffle and pick 5 random songs from the catalog
        randomSongs = [...artistSongs].sort(() => 0.5 - Math.random()).slice(0, 5);
        console.log(`Selected 5 random songs from artist's catalog of ${artistSongs.length} songs`);
      } else {
        // If we don't have enough songs in the database, try the utility function
        console.log(`Not enough songs in database, trying getRandomArtistSongs utility`);
        randomSongs = await getRandomArtistSongs(artistId, 5);
        
        if (!randomSongs || randomSongs.length === 0) {
          console.error(`No songs found for artist ${artistId} using getRandomArtistSongs`);
          return false;
        }
      }
      
      if (randomSongs.length === 0) {
        console.warn(`No songs found for artist ${artistId}, setlist will be empty`);
        return false;
      }
      
      // Prepare songs for insertion into setlist_songs table
      const setlistSongs = randomSongs.map(song => ({
        setlist_id: setlistId,
        track_id: song.id,
        votes: 0,
        created_at: new Date().toISOString()
      }));
      
      // Insert the songs into the setlist_songs table
      const { error: insertError } = await supabase
        .from('setlist_songs')
        .insert(setlistSongs);
      
      if (insertError) {
        console.error("Error inserting songs into setlist:", insertError);
        return false;
      }
      
      console.log(`Successfully added ${setlistSongs.length} songs to setlist ${setlistId}`);
      return true;
    } catch (error) {
      console.error("Error populating setlist with random songs:", error);
      return false;
    }
  };
  
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
          
          // Check if this setlist has songs
          supabase
            .from('setlist_songs')
            .select('id')
            .eq('setlist_id', id)
            .limit(1)
            .then(({ data: songsData, error: songsError }) => {
              if (!songsError && (!songsData || songsData.length === 0)) {
                console.log(`Setlist ${id} exists but has no songs. Will populate with random songs.`);
                
                // Get the artist ID from the show
                supabase
                  .from('shows')
                  .select('artist_id')
                  .eq('id', showId)
                  .single()
                  .then(({ data: showData }) => {
                    if (showData?.artist_id) {
                      // Add random songs to the empty setlist
                      populateSetlistWithRandomSongs(id, showData.artist_id);
                    }
                  });
              }
            });
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
