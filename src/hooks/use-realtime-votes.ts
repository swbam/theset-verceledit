
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

// Mock websocket data handler to simulate real-time updates
// In a real app, this would connect to a real WebSocket server
const createMockWebSocket = (showId: string, callback: (data: any) => void) => {
  console.log(`Creating mock WebSocket connection for show ${showId}`);
  
  // Simulate incoming votes from other users every 5-15 seconds
  const interval = setInterval(() => {
    // 30% chance of a vote update
    if (Math.random() > 0.7) {
      const songIds = ['song1', 'song2', 'song3', 'song4', 'song5', 'song6', 'song7', 'song8', 'song9', 'song10'];
      const randomSongIndex = Math.floor(Math.random() * songIds.length);
      const randomSongId = songIds[randomSongIndex];
      
      // Mock vote update
      callback({
        type: 'vote_update',
        data: {
          songId: randomSongId,
          votes: 1, // Single vote increment
          userId: `user${Math.floor(Math.random() * 1000)}`, // Random user ID
        }
      });
    }
  }, Math.random() * 10000 + 5000); // Random interval between 5-15 seconds
  
  // Return cleanup function
  return () => {
    console.log(`Closing mock WebSocket connection for show ${showId}`);
    clearInterval(interval);
  };
};

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
  const [voteHistory, setVoteHistory] = useState<Set<string>>(new Set());
  const { isAuthenticated, user } = useAuth();
  
  // Connect to WebSocket on mount
  useEffect(() => {
    if (!showId) return;
    
    // Initialize vote history from initialSongs
    const initialVotes = new Set<string>();
    initialSongs.forEach(song => {
      if (song.userVoted) {
        initialVotes.add(song.id);
      }
    });
    setVoteHistory(initialVotes);
    
    // Connect to WebSocket (mock implementation)
    setIsConnected(true);
    toast.success('Connected to real-time updates');
    
    // Handle incoming vote updates
    const handleVoteUpdate = (data: any) => {
      if (data.type === 'vote_update') {
        const { songId, votes, userId } = data.data;
        
        // Update song votes
        setSongs(prevSongs => 
          prevSongs.map(song => 
            song.id === songId
              ? { ...song, votes: song.votes + votes }
              : song
          ).sort((a, b) => b.votes - a.votes) // Re-sort by votes
        );
        
        // Show toast notification for other users' votes
        if (user?.id !== userId) {
          toast.info('Someone just voted for a song!');
        }
      }
    };
    
    // Create mock WebSocket connection
    const cleanup = createMockWebSocket(showId, handleVoteUpdate);
    
    // Cleanup function
    return () => {
      setIsConnected(false);
      cleanup();
    };
  }, [showId, initialSongs, user]);
  
  // Function to vote for a song
  const voteForSong = (songId: string) => {
    if (!isAuthenticated) {
      toast.error('Please log in to vote');
      return;
    }
    
    // Check if user already voted for this song using voteHistory
    if (voteHistory.has(songId)) {
      toast.error('You have already voted for this song');
      return;
    }
    
    // Update local state immediately (optimistic update)
    setSongs(prevSongs => 
      prevSongs.map(song => 
        song.id === songId
          ? { ...song, votes: song.votes + 1, userVoted: true }
          : song
      ).sort((a, b) => b.votes - a.votes) // Re-sort by votes
    );
    
    // Update vote history
    setVoteHistory(prev => {
      const newHistory = new Set(prev);
      newHistory.add(songId);
      return newHistory;
    });
    
    // In a real app, this would send the vote to the server
    toast.success('Vote recorded!');
    
    // Simulate the server broadcasting the vote to all clients
    console.log(`Voted for song: ${songId}`);
    
    // In a real app with WebSockets, the server would broadcast this vote
    // to all connected clients, and we would NOT need to update local state here
    // as the WebSocket would receive the update and trigger the same state change
  };
  
  return {
    songs: songs.sort((a, b) => b.votes - a.votes), // Always ensure songs are sorted by votes
    isConnected,
    voteForSong,
    voteHistory: Array.from(voteHistory)
  };
}
