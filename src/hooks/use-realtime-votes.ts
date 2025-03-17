
import { useState, useEffect, useCallback } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { addSongToSetlist, voteForSetlistSong } from "@/lib/api/db/setlist-utils";
import { useAuth } from "@/contexts/auth";

interface Song {
  id: string;
  name: string;
  votes: number;
  userVoted: boolean;
}

interface UseRealtimeVotesProps {
  showId: string;
  initialSongs: Song[];
}

export function useRealtimeVotes({ showId, initialSongs }: UseRealtimeVotesProps) {
  const [songs, setSongs] = useState<Song[]>(initialSongs);
  const [isConnected, setIsConnected] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [setlistId, setSetlistId] = useState<string | null>(null);
  const { user } = useAuth();
  const [anonymousVoteCount, setAnonymousVoteCount] = useState<number>(() => {
    // Initialize from localStorage if it exists
    const stored = localStorage.getItem(`anonymousVotes-${showId}`);
    return stored ? parseInt(stored, 10) : 0;
  });
  
  // Store voted songs for anonymous users
  const [anonymousVotedSongs, setAnonymousVotedSongs] = useState<string[]>(() => {
    // Initialize from localStorage if it exists
    const stored = localStorage.getItem(`anonymousVotedSongs-${showId}`);
    return stored ? JSON.parse(stored) : [];
  });
  
  // Get setlist_id for this show
  useEffect(() => {
    if (!showId) return;
    
    const getSetlistId = async () => {
      console.log("Getting setlist ID for show:", showId);
      const { data, error } = await supabase
        .from('setlists')
        .select('id')
        .eq('show_id', showId)
        .maybeSingle();
        
      if (error) {
        console.error("Error fetching setlist:", error);
        return;
      }
      
      if (data?.id) {
        console.log(`Found setlist ${data.id} for show ${showId}`);
        setSetlistId(data.id);
      } else {
        console.warn(`No setlist found for show ${showId}, will create one`);
        // Try to get artist_id to create a setlist
        const { data: showData } = await supabase
          .from('shows')
          .select('artist_id')
          .eq('id', showId)
          .maybeSingle();
          
        if (showData?.artist_id) {
          console.log(`Found artist_id ${showData.artist_id} for show ${showId}`);
          // Create setlist (this is a simplified version)
          const { data: setlist, error: setlistError } = await supabase
            .from('setlists')
            .insert({ show_id: showId, last_updated: new Date().toISOString() })
            .select('id')
            .single();
            
          if (setlistError) {
            console.error("Error creating setlist:", setlistError);
          } else if (setlist) {
            console.log(`Created setlist ${setlist.id} for show ${showId}`);
            setSetlistId(setlist.id);
          }
        } else {
          console.error(`No artist_id found for show ${showId}, cannot create setlist`);
        }
      }
    };
    
    getSetlistId();
  }, [showId]);
  
  // Initialize songs from initialSongs when they're available
  useEffect(() => {
    if (initialSongs.length > 0 && !isInitialized) {
      // Restore user voted state from local storage for anonymous users
      const songsWithLocalVotes = initialSongs.map(song => ({
        ...song,
        userVoted: anonymousVotedSongs.includes(song.id)
      }));
      
      setSongs(songsWithLocalVotes);
      setIsInitialized(true);
      console.log("Initialized setlist with tracks:", initialSongs.length);
    }
  }, [initialSongs, isInitialized, anonymousVotedSongs]);
  
  // Setup real-time connection with Supabase
  useEffect(() => {
    if (!showId || !setlistId) return;
    
    console.log(`Setting up real-time voting for show: ${showId} and setlist: ${setlistId}`);
    
    // Create a real Supabase Realtime connection for votes
    const channel = supabase
      .channel('schema-db-changes')
      .on('postgres_changes', 
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'setlist_songs',
          filter: `setlist_id=eq.${setlistId}`
        },
        (payload) => {
          console.log("Setlist song updated:", payload);
          // Update vote count for this song
          setSongs(currentSongs => 
            currentSongs.map(song => {
              if (song.id === payload.new.track_id) {
                return {
                  ...song,
                  votes: payload.new.votes
                };
              }
              return song;
            })
          );
        }
      )
      .on('postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'setlist_songs',
          filter: `setlist_id=eq.${setlistId}`
        },
        (payload) => {
          console.log("New song added to setlist:", payload);
          // We need to fetch the song details from the top_tracks table
          supabase
            .from('top_tracks')
            .select('*')
            .eq('id', payload.new.track_id)
            .single()
            .then(({ data: trackData, error }) => {
              if (error) {
                console.error("Error fetching new song details:", error);
                return;
              }
              
              if (trackData) {
                console.log("Adding new song to UI:", trackData.name);
                // Add the new song to the UI
                setSongs(currentSongs => [
                  ...currentSongs,
                  {
                    id: payload.new.track_id,
                    name: trackData.name,
                    votes: payload.new.votes || 0,
                    userVoted: false
                  }
                ]);
              }
            });
        }
      )
      .subscribe();
      
    setIsConnected(true);
    console.log("Real-time connection established");
    
    // Cleanup on unmount
    return () => {
      supabase.removeChannel(channel);
      setIsConnected(false);
      console.log("Real-time connection closed");
    };
  }, [showId, setlistId]);
  
  // Vote for a song
  const voteForSong = useCallback(async (songId: string, isAuthenticated: boolean) => {
    // Check if anonymous user has used all their votes
    if (!isAuthenticated && anonymousVoteCount >= 3) {
      console.log(`Anonymous user has used all ${anonymousVoteCount} votes`);
      toast.info("You've used all your free votes. Log in to vote more!");
      return false;
    }
    
    // Check if we have a setlist ID
    if (!setlistId) {
      console.error("Cannot vote: No setlist ID available");
      toast.error("Cannot vote right now, please try again later");
      return false;
    }
    
    // Find the setlist_song to vote for
    const { data: setlistSong, error: findError } = await supabase
      .from('setlist_songs')
      .select('id')
      .eq('setlist_id', setlistId)
      .eq('track_id', songId)
      .maybeSingle();
      
    if (findError || !setlistSong) {
      console.error("Error finding setlist song:", findError);
      toast.error("Could not find this song in the setlist");
      return false;
    }
    
    // Optimistically update UI
    setSongs(currentSongs => 
      currentSongs.map(song => {
        // If this is the song to vote for
        if (song.id === songId) {
          // Check if user has already voted
          if (song.userVoted) {
            console.log(`Already voted for song: ${song.name}`);
            toast.info("You've already voted for this song");
            return song;
          }
          
          console.log(`Voting for song: ${song.name}`);
          
          // If not authenticated, update anonymous vote count
          if (!isAuthenticated) {
            const newCount = anonymousVoteCount + 1;
            setAnonymousVoteCount(newCount);
            localStorage.setItem(`anonymousVotes-${showId}`, newCount.toString());
            
            // Store voted song ID in localStorage
            const newVotedSongs = [...anonymousVotedSongs, songId];
            setAnonymousVotedSongs(newVotedSongs);
            localStorage.setItem(`anonymousVotedSongs-${showId}`, JSON.stringify(newVotedSongs));
          }
          
          return {
            ...song,
            votes: song.votes + 1,
            userVoted: true
          };
        }
        return song;
      })
    );
    
    // Actually submit the vote to the server
    if (isAuthenticated && user?.id) {
      const success = await voteForSetlistSong(setlistSong.id, user.id);
      if (!success) {
        console.error("Server rejected vote");
        // Rollback optimistic update
        setSongs(currentSongs => 
          currentSongs.map(song => {
            if (song.id === songId) {
              return {
                ...song,
                votes: song.votes - 1,
                userVoted: false
              };
            }
            return song;
          })
        );
        toast.error("Vote could not be processed");
        return false;
      }
    }
    
    console.log(`Vote registered for song ID: ${songId}`);
    return true;
  }, [anonymousVoteCount, anonymousVotedSongs, showId, setlistId, user]);
  
  // Add a new song to the setlist
  const addSongToSetlist = useCallback(async (newSong: Song) => {
    console.log("Adding song to setlist:", newSong);
    
    if (!setlistId) {
      console.error("Cannot add song: No setlist ID available");
      toast.error("Cannot add songs right now, please try again later");
      return;
    }
    
    // Check if song already exists in the setlist
    const songExists = songs.some(song => song.id === newSong.id);
    
    if (songExists) {
      console.log(`Song already exists in setlist: ${newSong.name}`);
      toast.info("This song is already in the setlist");
      return;
    }
    
    // Optimistically update UI
    setSongs(currentSongs => [...currentSongs, newSong]);
    
    // Send to server
    const userId = user?.id || null;
    const songId = await addSongToSetlist(setlistId, newSong.id, userId);
    
    if (!songId) {
      console.error("Failed to add song to setlist on server");
      // Rollback optimistic update
      setSongs(currentSongs => currentSongs.filter(song => song.id !== newSong.id));
      toast.error("Could not add song to setlist");
      return;
    }
    
    console.log(`Song ${newSong.name} added to setlist with ID ${songId}`);
  }, [setlistId, songs, user]);
  
  return {
    songs,
    isConnected,
    voteForSong,
    addSongToSetlist,
    anonymousVoteCount,
    anonymousVotedSongs
  };
}
