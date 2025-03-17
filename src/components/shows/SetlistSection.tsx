
import React from 'react';
import { useAuth } from '@/contexts/auth/AuthContext';
import { useArtistTracks } from '@/hooks/artist-tracks.ts';
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
  const initialSongsResult = useInitialSongs(spotifyArtistId);
  
  // Get artist tracks for the setlist
  const { 
    isLoadingTracks, 
    isLoadingAllTracks, 
    availableTracks 
  } = useArtistTracks(spotifyArtistId, initialSongsResult);
  
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
  } = useRealtimeVotes(showId, spotifyArtistId, initialSongsResult);
  
  // Show loading indicator if we're loading tracks
  if (isLoadingTracks) {
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
