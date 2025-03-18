
import React, { useEffect } from 'react';
import { useAuth } from '@/contexts/auth/AuthContext';
import { useArtistTracks } from '@/hooks/artist-tracks';
import { useInitialSongs } from '@/hooks/artist-tracks/use-initial-songs';
import { useRealtimeVotes } from '@/hooks/use-realtime-votes';
import { LoadingIndicator } from '@/components/ui/loading';
import ShowSetlist from '@/components/shows/setlist/ShowSetlist';
import { useSongManagement } from '@/hooks/realtime/use-song-management';
import { toast } from 'sonner';

interface SetlistSectionProps {
  showId: string;
  spotifyArtistId: string;
}

const SetlistSection = ({ showId, spotifyArtistId }: SetlistSectionProps) => {
  const { isAuthenticated, login } = useAuth();
  
  // Get initial songs
  const { songs: initialSongs, isLoading: isLoadingInitialSongs } = useInitialSongs(spotifyArtistId);
  
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
    setlistId,
    getSetlistId,
    refetchSongs
  } = useRealtimeVotes(showId, spotifyArtistId, initialSongs);
  
  // Get song management functions
  const { addInitialSongs } = useSongManagement(
    setlistId,
    showId,
    getSetlistId,
    refetchSongs,
    setlist
  );
  
  // Add initial songs to the setlist when it's created
  useEffect(() => {
    if (setlistId && initialSongs && initialSongs.length > 0 && (!setlist || setlist.length === 0)) {
      console.log(`Adding ${initialSongs.length} initial songs to setlist ${setlistId}`);
      
      // Add a small delay to ensure the setlist is fully created in the database
      const timer = setTimeout(() => {
        addInitialSongs(setlistId, initialSongs)
          .then(success => {
            if (success) {
              console.log("Successfully added initial songs to setlist");
            } else {
              console.error("Failed to add initial songs to setlist");
            }
          })
          .catch(error => {
            console.error("Error adding initial songs:", error);
          });
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [setlistId, initialSongs, setlist, addInitialSongs]);
  
  // Show loading indicator if we're loading tracks
  if (isLoadingTracks || isLoadingSetlist || isLoadingInitialSongs) {
    return (
      <div className="flex justify-center p-8">
        <LoadingIndicator size="lg" message="Loading setlist..." />
      </div>
    );
  }
  
  // Function to handle adding a song with the selected track
  const onAddSong = async () => {
    if (!selectedTrack) {
      toast.error("Please select a song first");
      return;
    }
    
    // Find the selected track in the available tracks
    const trackToAdd = availableTracks.find(track => track.id === selectedTrack);
    if (!trackToAdd) {
      console.error("Selected track not found in available tracks");
      toast.error("Selected track not found. Please try another song.");
      return;
    }
    
    console.log("Track found, adding to setlist:", trackToAdd.name);
    
    try {
      // Call the handleAddSong function with the track ID and name
      const success = await handleAddSong(selectedTrack, trackToAdd.name || '');
      
      if (success) {
        // Reset the selected track
        setSelectedTrack('');
        
        // Show success message
        toast.success(`Added "${trackToAdd.name}" to the setlist`);
        
        // Force refetch songs to update the UI
        setTimeout(() => {
          refetchSongs();
        }, 500);
      } else {
        toast.error("Failed to add song to setlist");
      }
    } catch (error) {
      console.error("Error adding song:", error);
      toast.error("An error occurred while adding the song");
    }
  };
  
  return (
    <ShowSetlist 
      setlist={setlist || []}
      handleVote={vote}
      availableTracks={availableTracks || []}
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
