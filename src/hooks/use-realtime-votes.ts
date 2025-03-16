
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
      const songIds = ['song1', 'song2', 'song3', 'song4', 'song5', 'song6', 'song7', 'song8', 'song9', 'song10'];
      const randomSongIndex = Math.floor(Math.random() * songIds.length);
      const randomSongId = songIds[randomSongIndex];
      
      // Mock vote update
      callback({
        type: 'vote_update',
        data: {
          songId: randomSongId,
          votes: Math.floor(Math.random() * 5) + 1, // Random increment between 1-5
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
  
  useEffect(() => {
    if (!showId) return;
    
    // Connect to WebSocket (mock implementation)
    setIsConnected(true);
    toast.success('Connected to real-time updates');
    
    // Handle incoming vote updates
    const handleVoteUpdate = (data: any) => {
      if (data.type === 'vote_update') {
        setSongs(prevSongs => 
          prevSongs.map(song => 
            song.id === data.data.songId
              ? { ...song, votes: song.votes + data.data.votes }
              : song
          )
        );
      }
    };
    
    // Create mock WebSocket connection
    const cleanup = createMockWebSocket(showId, handleVoteUpdate);
    
    // Cleanup function
    return () => {
      setIsConnected(false);
      cleanup();
    };
  }, [showId]);
  
  // Function to vote for a song
  const voteForSong = (songId: string) => {
    if (!isAuthenticated) {
      toast.error('Please log in to vote');
      return;
    }
    
    // Check if user already voted for this song
    const alreadyVoted = songs.find(song => song.id === songId)?.userVoted;
    
    if (alreadyVoted) {
      toast.error('You have already voted for this song');
      return;
    }
    
    // Update local state immediately (optimistic update)
    setSongs(prevSongs => 
      prevSongs.map(song => 
        song.id === songId
          ? { ...song, votes: song.votes + 1, userVoted: true }
          : song
      )
    );
    
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
