
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

// Mock websocket data handler to simulate real-time updates
// In a real app, this would connect to a real WebSocket server
const createMockWebSocket = (showId: string, callback: (data: any) => void) => {
  console.log(`Creating mock WebSocket connection for show ${showId}`);
  
  // Simulate incoming votes every 5-15 seconds
  const interval = setInterval(() => {
    // 30% chance of a vote update
    if (Math.random() > 0.7) {
      // Get random song ID from the first 10 songs
      const songIds = [];
      for (let i = 1; i <= 10; i++) {
        songIds.push(`track${i}`);
      }
      const randomSongIndex = Math.floor(Math.random() * songIds.length);
      const randomSongId = songIds[randomSongIndex];
      
      // Mock vote update
      callback({
        type: 'vote_update',
        data: {
          songId: randomSongId,
          votes: 1, // Increment by 1 vote
          userId: `user-${Math.floor(Math.random() * 1000)}`
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
  const { isAuthenticated } = useAuth();
  const [voteCount, setVoteCount] = useState(0);
  
  // Initialize songs with user votes if user is authenticated
  useEffect(() => {
    if (initialSongs.length > 0) {
      setSongs(initialSongs);
    }
  }, [initialSongs]);
  
  useEffect(() => {
    if (!showId) return;
    
    let wsConnection: () => void;
    
    // Connect to WebSocket
    const connectWebSocket = () => {
      setIsConnected(true);
      toast.success('Connected to real-time updates');
      
      // Handle incoming vote updates
      const handleVoteUpdate = (data: any) => {
        if (data.type === 'vote_update') {
          setSongs(prevSongs => {
            // First, create a new array with updated vote counts
            const updatedSongs = prevSongs.map(song => 
              song.id === data.data.songId
                ? { ...song, votes: song.votes + data.data.votes }
                : song
            );
            
            // Then sort by vote count (descending)
            return [...updatedSongs].sort((a, b) => b.votes - a.votes);
          });
        }
      };
      
      // Create mock WebSocket connection
      wsConnection = createMockWebSocket(showId, handleVoteUpdate);
    };
    
    // Attempt to connect
    connectWebSocket();
    
    // Cleanup function
    return () => {
      if (wsConnection) {
        wsConnection();
      }
      setIsConnected(false);
    };
  }, [showId]);
  
  // Function to vote for a song
  const voteForSong = (songId: string) => {
    // Check if user already voted for this song
    const alreadyVoted = songs.find(song => song.id === songId)?.userVoted;
    
    if (alreadyVoted) {
      toast.error('You have already voted for this song');
      return;
    }
    
    // Allow one vote for non-authenticated users
    if (!isAuthenticated && voteCount >= 1) {
      toast.error('Please log in to vote for more songs');
      return;
    }
    
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
    
    // In a real app, this would send a vote to the server
    toast.success('Vote recorded!');
    
    // Simulate the server confirming the vote
    console.log(`Voted for song: ${songId}`);
  };
  
  return {
    songs,
    isConnected,
    voteForSong
  };
}
