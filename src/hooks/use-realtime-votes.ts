
import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/auth/AuthContext';
import { toast } from 'sonner';
import { voteForSetlistSong, getSetlistSongs, SetlistSong } from '@/lib/api/db/setlist-utils';
import { createSetlistForShow } from '@/lib/api/db/show-utils';
import { addSongToSetlist } from '@/lib/api/db/setlist-utils';

interface Song {
  id: string;
  name: string;
  votes: number;
  userVoted: boolean;
  albumName?: string;
  albumImageUrl?: string;
  artistName?: string;
  setlistSongId?: string;
}

export function useRealtimeVotes(showId: string, spotifyArtistId: string, initialSongs: Song[]) {
  const queryClient = useQueryClient();
  const { user, isAuthenticated } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [anonymousVoteCount, setAnonymousVoteCount] = useState(() => {
    return parseInt(localStorage.getItem(`anonymous_votes_${showId}`) || '0', 10);
  });
  
  // State for managing the songs shown on the current page
  const [setlist, setSetlist] = useState<Song[]>([]);
  const [selectedTrack, setSelectedTrack] = useState<string>('');
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
    error: dbSongsError
  } = useQuery({
    queryKey: ['setlistSongs', showId, setlistId],
    queryFn: async () => {
      if (!setlistId) return [];
      console.log(`Fetching songs for setlist ${setlistId}`);
      const songs = await getSetlistSongs(setlistId, user?.id);
      console.log(`Fetched ${songs.length} songs from database`);
      return songs;
    },
    enabled: !!setlistId,
  });
  
  // Get setlist ID when showId is available
  useEffect(() => {
    if (showId) {
      getSetlistId(showId).then(id => {
        if (id) {
          setSetlistId(id);
        }
      });
    }
  }, [showId, getSetlistId]);
  
  // Add initial songs to the database if none exist yet
  useEffect(() => {
    const addInitialSongs = async () => {
      if (!setlistId || !initialSongs || initialSongs.length === 0) return;
      
      // If we have songs from the database, don't add initial songs
      if (dbSongs && dbSongs.length > 0) {
        console.log("Setlist already has songs, not adding initial ones");
        return;
      }
      
      console.log("No songs in database, adding initial ones:", initialSongs.length);
      
      // Add each song to the setlist
      for (const song of initialSongs) {
        if (!song.id.startsWith('placeholder')) {
          console.log(`Adding initial song to setlist: ${song.name}`);
          await addSongToSetlist(setlistId, song.id);
        }
      }
      
      // Invalidate the query to reload songs
      queryClient.invalidateQueries({ queryKey: ['setlistSongs', showId, setlistId] });
    };
    
    if (isLoadingDbSongs === false) {
      addInitialSongs();
    }
  }, [setlistId, initialSongs, dbSongs, isLoadingDbSongs, queryClient, showId]);
  
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
        userVoted: song.userVoted,
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
  
  // Vote mutation
  const { mutate: vote } = useMutation({
    mutationFn: async (songId: string) => {
      try {
        console.log("Voting for song:", songId);
        
        if (!setlistId) {
          console.error("No setlist ID available, can't vote");
          return false;
        }
        
        // Find the song to get its setlistSongId
        const song = dbSongs?.find(s => s.id === songId);
        
        if (!song) {
          console.error("Song not found in database:", songId);
          return false;
        }
        
        if (!isAuthenticated) {
          // For anonymous voting, just track count locally
          console.log("Anonymous vote for song:", songId);
          
          // Check if we've reached the limit for anonymous votes
          if (anonymousVoteCount >= 3) {
            toast.error("You've reached the maximum number of anonymous votes. Log in to vote more!");
            return false;
          }
          
          // Increment anonymous vote count and save to localStorage
          const newCount = anonymousVoteCount + 1;
          setAnonymousVoteCount(newCount);
          localStorage.setItem(`anonymous_votes_${showId}`, newCount.toString());
          
          // Optimistically update the UI
          setSetlist(prev => 
            prev.map(s => 
              s.id === songId 
                ? { ...s, votes: s.votes + 1, userVoted: true } 
                : s
            ).sort((a, b) => b.votes - a.votes)
          );
          
          return true;
        } else {
          // Logged-in user vote
          console.log("Authenticated vote for song:", songId);
          
          // Call the vote function with the setlistSongId
          const success = await voteForSetlistSong(song.setlistSongId, user!.id);
          
          if (success) {
            // Optimistically update the UI
            setSetlist(prev => 
              prev.map(s => 
                s.id === songId 
                  ? { ...s, votes: s.votes + 1, userVoted: true } 
                  : s
              ).sort((a, b) => b.votes - a.votes)
            );
          }
          
          return success;
        }
      } catch (error) {
        console.error("Error voting for song:", error);
        return false;
      }
    },
    onSuccess: (success, songId) => {
      if (success) {
        console.log("Vote recorded successfully for song:", songId);
      }
    },
    onError: (error, songId) => {
      console.error(`Error voting for song ${songId}:`, error);
      toast.error("Error recording vote. Please try again.");
    }
  });
  
  // Handle adding a new song to the setlist
  const handleAddSong = useCallback(async () => {
    if (!setlistId || !selectedTrack) {
      console.error("Missing setlist ID or selected track");
      return;
    }
    
    console.log(`Adding song ${selectedTrack} to setlist ${setlistId}`);
    
    try {
      const songId = await addSongToSetlist(setlistId, selectedTrack);
      
      if (songId) {
        console.log("Song added successfully");
        toast.success("Song added to setlist!");
        setSelectedTrack('');
        // Refresh the songs list
        queryClient.invalidateQueries({ queryKey: ['setlistSongs', showId, setlistId] });
      } else {
        console.error("Failed to add song");
        toast.error("Failed to add song to setlist");
      }
    } catch (error) {
      console.error("Error adding song:", error);
      toast.error("Error adding song to setlist");
    }
  }, [setlistId, selectedTrack, queryClient, showId]);
  
  return {
    setlist,
    isConnected,
    isLoadingSetlist: isLoadingDbSongs,
    setlistError: dbSongsError,
    vote,
    selectedTrack,
    setSelectedTrack,
    handleAddSong,
    anonymousVoteCount
  };
}
