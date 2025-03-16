
import { useState, useEffect, useCallback } from 'react';

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
  
  // Update songs when initialSongs changes
  useEffect(() => {
    if (initialSongs.length > 0) {
      setSongs(initialSongs);
    }
  }, [initialSongs]);
  
  // Setup mock WebSocket connection
  useEffect(() => {
    console.log(`Setting up real-time voting for show: ${showId}`);
    
    // This is a mock - in production this would connect to a real WebSocket server
    const timeout = setTimeout(() => {
      setIsConnected(true);
      console.log("WebSocket connected");
    }, 800);
    
    // Cleanup on unmount
    return () => {
      clearTimeout(timeout);
      setIsConnected(false);
      console.log("WebSocket disconnected");
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
    
    // In a real app, this would send the vote to the server via WebSocket
    console.log(`Vote sent for song ID: ${songId}`);
  }, []);
  
  // Add a new song to the setlist
  const addSongToSetlist = useCallback((newSong: Song) => {
    setSongs(currentSongs => {
      // Check if song already exists in the setlist
      const songExists = currentSongs.some(song => song.id === newSong.id);
      
      if (songExists) {
        console.log(`Song already exists in setlist: ${newSong.name}`);
        return currentSongs;
      }
      
      console.log(`Adding new song to setlist: ${newSong.name}`);
      return [...currentSongs, newSong];
    });
    
    // In a real app, this would send the new song to the server via WebSocket
    console.log(`New song added to setlist: ${newSong.name}`);
  }, []);
  
  return {
    songs: songs.sort((a, b) => b.votes - a.votes), // Always return songs sorted by votes
    isConnected,
    voteForSong,
    addSongToSetlist
  };
}
