
import { useState } from 'react';
import { useRealtimeVotes } from '@/hooks/use-realtime-votes';
import { toast } from 'sonner';

export interface Song {
  id: string;
  name: string;
  votes: number;
  userVoted: boolean;
}

export function useSongManagement(showId: string, initialSongs: Song[], isAuthenticated: boolean, login: () => void) {
  const [selectedTrack, setSelectedTrack] = useState<string>('');
  
  const {
    setlist,
    isConnected,
    vote,
    selectedTrack: realtimeSelectedTrack,
    setSelectedTrack: realtimeSetSelectedTrack,
    handleAddSong: realtimeHandleAddSong,
    anonymousVoteCount
  } = useRealtimeVotes(showId, '', initialSongs);
  
  const handleVote = async (songId: string) => {
    try {
      const success = await vote(songId);
      if (success) {
        toast.success("Your vote has been counted!");
      } else if (!isAuthenticated && anonymousVoteCount >= 3) {
        // This will trigger a toast in the hook, but we also redirect to login
        setTimeout(() => {
          login();
        }, 2000);
      }
    } catch (error) {
      console.error("Error voting for song:", error);
      toast.error("Something went wrong while voting");
    }
  };

  const handleAddSong = async (allTracksData: any) => {
    if (!selectedTrack) {
      toast.error("Please select a song first");
      return false;
    }

    // Find the selected track in the available tracks
    const trackToAdd = allTracksData?.tracks?.find((track: any) => track.id === selectedTrack);
    
    if (trackToAdd) {
      // Check if the song already exists in the setlist
      const songExists = setlist.some(song => song.id === trackToAdd.id);
      
      if (songExists) {
        toast.info(`"${trackToAdd.name}" is already in the setlist!`);
        return false;
      }
      
      try {
        // Add the song to the setlist using the handleAddSong from useRealtimeVotes
        const result = await realtimeHandleAddSong();
        
        if (result) {
          setSelectedTrack('');
          toast.success(`"${trackToAdd.name}" added to setlist!`);
          
          // Log the update for debugging
          console.log(`Added song to setlist: ${trackToAdd.name}`, setlist.length + 1);
          return true;
        }
        return false;
      } catch (error) {
        console.error("Error adding song to setlist:", error);
        toast.error("Failed to add song to setlist");
        return false;
      }
    }
    
    return false;
  };

  return {
    setlist,
    isConnected,
    selectedTrack,
    setSelectedTrack,
    handleVote,
    handleAddSong,
    anonymousVoteCount
  };
}
