
import { useState, useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { getSetlistSongs } from '@/lib/api/db/setlist-utils';
import { createSetlistForShow } from '@/lib/api/database-utils';
import { Song } from './types';

/**
 * Hook for managing setlist data and realtime subscriptions
 */
export function useSetlist(showId: string, initialSongs: Song[], userId?: string) {
  const queryClient = useQueryClient();
  const [isConnected, setIsConnected] = useState(false);
  const [setlist, setSetlist] = useState<Song[]>([]);
  const [setlistId, setSetlistId] = useState<string | null>(null);
  
  // Function to get or create setlist ID for this show
  const getSetlistId = useCallback(async (showId: string) => {
    try {
      if (!showId) return null;
      
      console.log(`Getting setlist ID for show: ${showId}`);
      
      // Try to find existing setlist
      const { data, error } = await supabase
        .from('setlists')
        .select('id')
        .eq('show_id', showId)
        .maybeSingle();
      
      if (error) {
        console.error("Error fetching setlist:", error);
        return null;
      }
      
      // If setlist exists, return it
      if (data?.id) {
        console.log(`Found existing setlist: ${data.id}`);
        return data.id;
      }
      
      // If no setlist exists, we need to create one using the show's artist ID
      console.warn(`No setlist found for show ${showId}, will fetch artist_id to create one`);
      
      // Get the artist ID from the show table
      const { data: showData, error: showError } = await supabase
        .from('shows')
        .select('artist_id')
        .eq('id', showId)
        .maybeSingle();
      
      if (showError || !showData?.artist_id) {
        console.error("Error fetching show data:", showError);
        return null;
      }
      
      console.log(`Found artist_id ${showData.artist_id} for show ${showId}, creating setlist`);
      
      // Create the setlist in the database
      const newSetlistId = await createSetlistForShow({ id: showId, artist_id: showData.artist_id });
      
      if (!newSetlistId) {
        console.error("Failed to create setlist");
        return null;
      }
      
      console.log(`Created new setlist: ${newSetlistId}`);
      return newSetlistId;
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
        } else {
          console.error(`Failed to get or create setlist for show: ${showId}`);
        }
      });
    }
  }, [showId, getSetlistId]);
  
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
