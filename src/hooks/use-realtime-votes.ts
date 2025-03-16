
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { createMockWebSocketConnection } from '@/lib/api/mock-service';

export interface SongVote {
  id: string;
  name: string;
  votes: number;
  userVoted: boolean;
}

interface UseRealtimeVotesProps {
  showId: string;
  initialSongs: SongVote[];
}

export function useRealtimeVotes({ showId, initialSongs }: UseRealtimeVotesProps) {
  const [songs, setSongs] = useState<SongVote[]>(initialSongs);
  const [isConnected, setIsConnected] = useState(false);
  const { isAuthenticated, user } = useAuth();
  const [voteCount, setVoteCount] = useState(0);
  
  // Initialize songs when they change
  useEffect(() => {
    if (initialSongs.length > 0) {
      // Sort the songs by votes (descending)
      const sortedSongs = [...initialSongs].sort((a, b) => b.votes - a.votes);
      setSongs(sortedSongs);
    }
  }, [initialSongs]);
  
  // Connect to WebSocket for real-time updates
  useEffect(() => {
    if (!showId) return;
    
    // Create WebSocket connection
    const wsConnection = createMockWebSocketConnection(showId);
    
    // Connect to WebSocket
    const connectWebSocket = async () => {
      try {
        await wsConnection.connect();
        setIsConnected(true);
        
        // Handle incoming vote updates
        const unsubscribe = wsConnection.subscribe((data) => {
          if (data.type === 'vote_update') {
            setSongs(prevSongs => {
              // Update vote counts
              const updatedSongs = prevSongs.map(song => 
                song.id === data.data.songId
                  ? { ...song, votes: song.votes + data.data.votes }
                  : song
              );
              
              // Sort by vote count (descending)
              return [...updatedSongs].sort((a, b) => b.votes - a.votes);
            });
          }
        });
        
        // Return cleanup function
        return unsubscribe;
      } catch (error) {
        console.error("WebSocket connection error:", error);
        toast.error("Could not connect to real-time updates");
        setIsConnected(false);
        return () => {};
      }
    };
    
    // Connect to WebSocket
    let unsubscribe: (() => void) | undefined;
    connectWebSocket().then(cleanup => {
      unsubscribe = cleanup;
    });
    
    // Cleanup function
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
      wsConnection.close();
      setIsConnected(false);
    };
  }, [showId]);
  
  // Function to vote for a song
  const voteForSong = async (songId: string) => {
    // Check if user already voted for this song
    const alreadyVoted = songs.find(song => song.id === songId)?.userVoted;
    
    if (alreadyVoted) {
      toast.error('You have already voted for this song');
      return;
    }
    
    // Allow limited votes for non-authenticated users
    if (!isAuthenticated && voteCount >= 1) {
      toast.error('Please log in to vote for more songs');
      return;
    }
    
    // Get user ID for tracking votes
    const userId = user?.id || 'anonymous';
    
    // Update local state immediately (optimistic update)
    setSongs(prevSongs => {
      // First, update the song with the new vote
      const updatedSongs = prevSongs.map(song => 
        song.id === songId
          ? { ...song, votes: song.votes + 1, userVoted: true }
          : song
      );
      
      // Then sort by vote count (descending)
      return [...updatedSongs].sort((a, b) => b.votes - a.votes);
    });
    
    // Increment vote count for non-authenticated users
    if (!isAuthenticated) {
      setVoteCount(prev => prev + 1);
    }
    
    try {
      // In a real app, this would send a vote to the server
      // For now, we'll use the mock WebSocket connection to simulate this
      const wsConnection = createMockWebSocketConnection(showId);
      await wsConnection.sendVote(songId, userId);
      console.log(`Vote recorded for song: ${songId} by user: ${userId}`);
    } catch (error) {
      console.error("Error sending vote:", error);
      toast.error("Failed to record your vote");
      
      // Revert the optimistic update
      setSongs(prevSongs => {
        return prevSongs.map(song => 
          song.id === songId
            ? { ...song, votes: song.votes - 1, userVoted: false }
            : song
        );
      });
    }
  };
  
  return {
    songs,
    isConnected,
    voteForSong
  };
}
