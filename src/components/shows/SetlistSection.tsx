
import React from 'react';
import { useAuth } from '@/contexts/auth/AuthContext';
import { useArtistTracks } from '@/hooks/artist-tracks';
import { useInitialSongs } from '@/hooks/artist-tracks';
import { useRealtimeVotes } from '@/hooks/realtime';
import { LoadingIndicator } from '@/components/ui/loading';
import ShowSetlist from '@/components/shows/setlist/ShowSetlist';

interface SetlistSectionProps {
  showId: string;
  spotifyArtistId: string;
}

const SetlistSection = ({ showId, spotifyArtistId }: SetlistSectionProps) => {
  const { isAuthenticated, login } = useAuth();
  
  // Get initial songs and artist tracks for the setlist
  const { initialSongs, isLoadingInitialSongs } = useInitialSongs(spotifyArtistId);
  const { tracksData, isLoadingTracks, isLoadingAllTracks, availableTracks } = useArtistTracks(
    spotifyArtistId, 
    initialSongs
  );
  
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
  
  // Show loading indicator if we're loading either tracks or the setlist
  if (isLoadingInitialSongs || isLoadingTracks) {
    return (
      <div className="flex justify-center p-8">
        <LoadingIndicator size="lg" message="Loading setlist..." />
      </div>
    );
  }
  
  return (
    <ShowSetlist 
      setlist={setlist}
      handleVote={vote}
      availableTracks={availableTracks}
      isLoadingAllTracks={isLoadingAllTracks}
      selectedTrack={selectedTrack}
      setSelectedTrack={setSelectedTrack}
      handleAddSong={() => handleAddSong(selectedTrack, '')}
      isAuthenticated={isAuthenticated}
      login={login}
      anonymousVoteCount={anonymousVoteCount}
      setlistId={setlistId}
    />
  );
};

export default SetlistSection;
