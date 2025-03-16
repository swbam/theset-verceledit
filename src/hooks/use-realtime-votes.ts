
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
  
  // Setup real-time connection with Supabase
  useEffect(() => {
    if (!showId) return;
    
    console.log(`Setting up real-time voting for show: ${showId}`);
    
    // In a production app, this would be a real Supabase Realtime connection
    const timeout = setTimeout(() => {
      setIsConnected(true);
      console.log("Real-time connection established");
    }, 800);
    
    // Cleanup on unmount
    return () => {
      clearTimeout(timeout);
      setIsConnected(false);
      console.log("Real-time connection closed");
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
    
    console.log(`Vote registered for song ID: ${songId}`);
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
    
    console.log(`New song added to setlist: ${newSong.name}`);
  }, []);
  
  return {
    songs,
    isConnected,
    voteForSong,
    addSongToSetlist
  };
}
