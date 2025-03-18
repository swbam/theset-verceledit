
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
      if (!setlistId || !initialSongs) return;
      
      // If we have songs from the database, don't add initial ones
      if (setlist.length > 0) {
        console.log("Setlist already has songs, not adding initial ones");
        return;
      }
      
      // Make sure we have initial songs to add
      if (initialSongs.length === 0) {
        console.warn("No initial songs available to add to setlist");
        return;
      }
      
      console.log("No songs in database, adding initial ones:", initialSongs);
      
      // Ensure all initial songs have 0 votes
      const initialSongsWithZeroVotes = initialSongs.map(song => ({
        ...song,
        votes: 0,
        userVoted: false
      }));
      
      try {
        const result = await addInitialSongs(setlistId, initialSongsWithZeroVotes);
        console.log("Result of adding initial songs:", result);
        
        // Force a refetch of the setlist songs after adding initial ones
        setTimeout(() => {
          refetchSongs();
        }, 500);
      } catch (error) {
        console.error("Error adding initial songs:", error);
      }
    };
    
    // Run this effect as soon as we have a setlistId
    if (setlistId) {
      checkAndAddInitialSongs();
    }
  }, [setlistId, initialSongs, setlist.length, addInitialSongs, refetchSongs]);
  
  return {
    setlist,
    isConnected,
    isLoadingSetlist,
    setlistError,
    vote,
    selectedTrack,
    setSelectedTrack,
    handleAddSong: async (trackId: string, trackName: string) => {
      console.log(`Handling add song: ${trackId} - ${trackName}`);
      return await handleAddSong(trackId, trackName);
    },
    anonymousVoteCount,
    setlistId,
    getSetlistId,
    refetchSongs
  };
}
