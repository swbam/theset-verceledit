
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
  const voteForSong = useCallback((songId: string, isAuthenticated: boolean) => {
    // Check if anonymous user has used all their votes
    if (!isAuthenticated && anonymousVoteCount >= 3) {
      console.log(`Anonymous user has used all ${anonymousVoteCount} votes`);
      toast.info("You've used all your free votes. Log in to vote more!", {
        style: { background: "#14141F", color: "#fff", border: "1px solid rgba(255,255,255,0.1)" },
        action: {
          label: "Log in",
          onClick: () => {
            // The login action will be handled in the ShowDetail component
          }
        }
      });
      return false;
    }
    
    setSongs(currentSongs => 
      currentSongs.map(song => {
        // If this is the song to vote for
        if (song.id === songId) {
          // Check if user has already voted
          if (song.userVoted) {
            console.log(`Already voted for song: ${song.name}`);
            toast.info("You've already voted for this song", {
              style: { background: "#14141F", color: "#fff", border: "1px solid rgba(255,255,255,0.1)" }
            });
            return song;
          }
          
          // Add the vote
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
    
    console.log(`Vote registered for song ID: ${songId}`);
    return true;
  }, [anonymousVoteCount, anonymousVotedSongs, showId]);
  
  // Add a new song to the setlist
  const addSongToSetlist = useCallback((newSong: Song) => {
    console.log("Adding song to setlist:", newSong);
    
    setSongs(currentSongs => {
      // Check if song already exists in the setlist by ID
      const songExists = currentSongs.some(song => song.id === newSong.id);
      
      if (songExists) {
        console.log(`Song already exists in setlist: ${newSong.name}`);
        toast.info("This song is already in the setlist", {
          style: { background: "#14141F", color: "#fff", border: "1px solid rgba(255,255,255,0.1)" }
        });
        return currentSongs;
      }
      
      // Add new song to setlist
      console.log(`Adding new song to setlist: ${newSong.name}`);
      const updatedSongs = [...currentSongs, newSong];
      console.log("Updated setlist size:", updatedSongs.length);
      
      return updatedSongs;
    });
  }, []);
  
  return {
    songs,
    isConnected,
    voteForSong,
    addSongToSetlist,
    anonymousVoteCount,
    anonymousVotedSongs
  };
}
