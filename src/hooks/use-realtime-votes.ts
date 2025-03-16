
import { useState, useEffect, useCallback } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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
  
  // Initialize songs from initialSongs when they're available
  useEffect(() => {
    if (initialSongs.length > 0 && !isInitialized) {
      setSongs(initialSongs);
      setIsInitialized(true);
      console.log("Initialized setlist with tracks:", initialSongs.length);
    }
  }, [initialSongs, isInitialized]);
  
  // Setup mock WebSocket connection
  useEffect(() => {
    if (!showId) return;
    
    console.log(`Setting up real-time voting for show: ${showId}`);
    
    // This is a mock - in production this would connect to a real WebSocket server
    const timeout = setTimeout(() => {
      setIsConnected(true);
      console.log("WebSocket connected");
    }, 800);
    
    // In a real implementation, we would use Supabase Realtime here:
    // const channel = supabase.channel('setlist-votes')
    //   .on('broadcast', { event: 'vote' }, (payload) => {
    //     // Handle incoming votes...
    //   })
    //   .subscribe()
    
    // Cleanup on unmount
    return () => {
      clearTimeout(timeout);
      setIsConnected(false);
      console.log("WebSocket disconnected");
      
      // In a real implementation:
      // supabase.removeChannel(channel)
    };
  }, [showId]);
  
  // Vote for a song
  const voteForSong = useCallback((songId: string) => {
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
          
          // Add the vote
          console.log(`Voting for song: ${song.name}`);
          return {
            ...song,
            votes: song.votes + 1,
            userVoted: true
          };
        }
        return song;
      })
    );
    
    // In a real app, this would send the vote to the server via WebSocket/Supabase Realtime
    console.log(`Vote sent for song ID: ${songId}`);
    
    // Example of how this would be implemented with Supabase Realtime:
    // supabase.channel('setlist-votes').send({
    //   type: 'broadcast',
    //   event: 'vote',
    //   payload: { showId, songId }
    // })
  }, []);
  
  // Add a new song to the setlist
  const addSongToSetlist = useCallback((newSong: Song) => {
    setSongs(currentSongs => {
      // Check if song already exists in the setlist
      const songExists = currentSongs.some(song => song.id === newSong.id);
      
      if (songExists) {
        console.log(`Song already exists in setlist: ${newSong.name}`);
        toast.info("This song is already in the setlist");
        return currentSongs;
      }
      
      console.log(`Adding new song to setlist: ${newSong.name}`);
      return [...currentSongs, newSong];
    });
    
    // In a real app, this would send the new song to the server via WebSocket/Supabase Realtime
    console.log(`New song added to setlist: ${newSong.name}`);
    
    // Example with Supabase Realtime:
    // supabase.channel('setlist-songs').send({
    //   type: 'broadcast',
    //   event: 'add_song',
    //   payload: { showId, song: newSong }
    // })
  }, []);
  
  return {
    songs,
    isConnected,
    voteForSong,
    addSongToSetlist
  };
}
