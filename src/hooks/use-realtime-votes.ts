
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth/AuthContext';
import { 
  useSetlist,
  useAnonymousVoting,
  useVoting,
  useSongManagement,
  Song
} from './realtime';

export function useRealtimeVotes(showId: string, spotifyArtistId: string, initialSongs: Song[]) {
  const { user, isAuthenticated } = useAuth();
  const [selectedTrack, setSelectedTrack] = useState<string>('');
  
  // Get setlist data and realtime connection
  const {
    setlist,
    isConnected,
    isLoadingSetlist,
    setlistError,
    setlistId,
    refetchSongs,
    getSetlistId
  } = useSetlist(showId, initialSongs, user?.id);
  
  // Anonymous voting management
  const {
    anonymousVoteCount,
    incrementAnonymousVote,
    hasReachedVoteLimit
  } = useAnonymousVoting(showId);
  
  // Handle voting functionality
  const { vote, isVoting } = useVoting(
    setlistId, 
    setlist, 
    user?.id, 
    showId,
    isAuthenticated,
    incrementAnonymousVote,
    hasReachedVoteLimit
  );
  
  // Song management functionality
  const { handleAddSong, addInitialSongs } = useSongManagement(
    setlistId,
    showId,
    getSetlistId,
    refetchSongs,
    setlist
  );
  
  // Add initial songs to the database if none exist yet
  useEffect(() => {
    const checkAndAddInitialSongs = async () => {
      if (!setlistId || !initialSongs || initialSongs.length === 0) return;
      
      // If we have songs from the database, don't add initial songs
      if (setlist.length > 0) {
        console.log("Setlist already has songs, not adding initial ones");
        return;
      }
      
      console.log("No songs in database, adding initial ones:", initialSongs.length);
      await addInitialSongs(setlistId, initialSongs);
    };
    
    if (!isLoadingSetlist && setlistId) {
      checkAndAddInitialSongs();
    }
  }, [setlistId, initialSongs, setlist.length, isLoadingSetlist, addInitialSongs]);
  
  return {
    setlist,
    isConnected,
    isLoadingSetlist,
    setlistError,
    vote,
    selectedTrack,
    setSelectedTrack,
    handleAddSong: async (trackId: string, trackName: string) => {
      await handleAddSong(trackId, trackName);
    },
    anonymousVoteCount,
    setlistId // Export the setlistId so it can be passed to the component
  };
}
