
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
    songs: setlist,
    isConnected,
    voteForSong,
    addSongToSetlist, // Ensure this is destructured
    anonymousVoteCount
  } = useRealtimeVotes({
    showId: showId || '',
    // Removed initialSongs argument as it's no longer expected by useRealtimeVotes
  });

  const handleVote = async (songId: string) => { // Make handler async
    const voteSuccess = await voteForSong(songId); // Await the async call, remove isAuthenticated arg if not needed by voteForSong

    if (voteSuccess) {
      toast.success("Your vote has been counted!");
    } else if (!isAuthenticated && anonymousVoteCount >= 3) {
      // This will trigger a toast in the hook, but we also redirect to login
      setTimeout(() => {
        login();
      }, 2000);
    }
  };

  const handleAddSong = (allTracksData: any) => {
    if (!selectedTrack) {
      toast.error("Please select a song first");
      return;
    }

    // Find the selected track in the available tracks
    const trackToAdd = allTracksData?.tracks?.find((track: any) => track.id === selectedTrack);
    
    if (trackToAdd) {
      // Check if the song already exists in the setlist
      const songExists = setlist.some(song => song.id === trackToAdd.id);
      
      if (songExists) {
        toast.info(`"${trackToAdd.name}" is already in the setlist!`);
        return;
      }
      // Add the song to the setlist
      // Ensure the object passed matches the expected RealtimeSong type
      addSongToSetlist({
        id: trackToAdd.id, // Assuming trackToAdd.id is string
        name: trackToAdd.name, // Assuming trackToAdd.name is string
        votes: 0,
        userVoted: false
      });
      
      setSelectedTrack('');
      toast.success(`"${trackToAdd.name}" added to setlist!`);
      
      // Log the update for debugging
      console.log(`Added song to setlist: ${trackToAdd.name}`, setlist.length + 1);
    }
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
