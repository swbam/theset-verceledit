
import React from 'react';
import { useAuth } from '@/contexts/auth/AuthContext';
import { useArtistTracks } from '@/hooks/artist-tracks';
import { useInitialSongs } from '@/hooks/artist-tracks/use-initial-songs';
import { useRealtimeVotes } from '@/hooks/use-realtime-votes';
import { LoadingIndicator } from '@/components/ui/loading';
import ShowSetlist from '@/components/shows/setlist/ShowSetlist';

interface SetlistSectionProps {
  showId: string;
  spotifyArtistId: string;
}

const SetlistSection = ({ showId, spotifyArtistId }: SetlistSectionProps) => {
  const { isAuthenticated, login } = useAuth();
  
  // Get initial songs
  const initialSongs = useInitialSongs(spotifyArtistId);
  
  // Get artist tracks for the setlist
  const { 
    isLoadingTracks, 
    isLoadingAllTracks, 
    availableTracks 
  } = useArtistTracks(spotifyArtistId, initialSongs);
  
  // Use the realtime voting hook
  const { 
    setlist, 
    isLoadingSetlist, 
    vote, 
    selectedTrack, 
    setSelectedTrack, 
    handleAddSong,
    anonymousVoteCount,
    setlistId
  } = useRealtimeVotes(showId, spotifyArtistId, initialSongs);
  
  // Show loading indicator if we're loading tracks
  if (isLoadingTracks) {
    return (
      <div className="flex justify-center p-8">
        <LoadingIndicator size="lg" message="Loading setlist..." />
      </div>
    );
  }
  
  // Function to handle adding a song with the selected track
  const onAddSong = async () => {
    console.log("Adding song with track ID:", selectedTrack);
    if (!selectedTrack) return;
    
    // Find the selected track in the available tracks
    const trackToAdd = availableTracks.find(track => track.id === selectedTrack);
    if (!trackToAdd) {
      console.error("Selected track not found in available tracks");
      return;
    }
    
    // Call the handleAddSong function with the track ID and name
    await handleAddSong(selectedTrack, trackToAdd.name || '');
    
    // Reset the selected track
    setSelectedTrack('');
  };
  
  return (
    <ShowSetlist 
      setlist={setlist}
      handleVote={vote}
      availableTracks={availableTracks}
      isLoadingAllTracks={isLoadingAllTracks}
      selectedTrack={selectedTrack}
      setSelectedTrack={setSelectedTrack}
      handleAddSong={onAddSong}
      isAuthenticated={isAuthenticated}
      login={login}
      anonymousVoteCount={anonymousVoteCount}
      setlistId={setlistId}
    />
  );
};

export default SetlistSection;
