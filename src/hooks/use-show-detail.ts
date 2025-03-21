
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useShowDetails } from '@/hooks/use-show-details';
import { useArtistTracks } from '@/hooks/use-artist-tracks';
import { useSongManagement } from '@/hooks/use-song-management';
import { useAuth } from '@/contexts/auth';

export function useShowDetail(id: string | undefined) {
  const [documentMetadata, setDocumentMetadata] = useState({
    title: '',
    description: ''
  });
  const { isAuthenticated, login } = useAuth();
  
  // Get show details immediately
  const { 
    show, 
    isLoadingShow, 
    isError, 
    showError, 
    spotifyArtistId 
  } = useShowDetails(id);
  
  // Set document metadata when show data is available
  useEffect(() => {
    if (show && !isLoadingShow) {
      const artistName = show.artist?.name || 'Artist';
      const venueName = show.venue?.name || 'Venue';
      const venueCity = show.venue?.city || '';
      const venueState = show.venue?.state || '';
      const venueLocation = venueCity && venueState ? `${venueCity}, ${venueState}` : (venueCity || venueState || 'Location');
      
      const showDate = new Date(show.date);
      const formattedDate = showDate.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short', 
        day: 'numeric', 
        year: 'numeric'
      });
      
      const title = `TheSet | ${artistName} at ${venueName} in ${venueLocation} | ${formattedDate}`;
      const description = `Vote on ${artistName}'s setlist for their show at ${venueName} in ${venueLocation} on ${formattedDate}. Influence what songs they'll play live!`;
      
      setDocumentMetadata({
        title,
        description
      });
    }
  }, [show, isLoadingShow]);
  
  // Get artist tracks - we need to enable immediate fetching to restore previous behavior
  const artistTracksResponse = useArtistTracks(
    show?.artist_id, 
    spotifyArtistId,
    { immediate: true }  // Changed to true to load tracks immediately
  );
  
  // Function to load tracks manually when needed
  const loadTracks = useCallback(() => {
    if (artistTracksResponse.refetch) {
      console.log("Manually loading artist tracks");
      artistTracksResponse.refetch();
    }
  }, [artistTracksResponse]);
  
  // Extract all needed properties with defaults to avoid undefined errors
  const {
    tracks = [],
    isLoading: isLoadingTracks = false,
    isError: isTracksError = false,
    error: tracksError = null,
    initialSongs = [],
    storedTracksData = [],
    getAvailableTracks = (setlist: any[]) => [],
  } = artistTracksResponse || {};
  
  // For backward compatibility, create these properties
  const isLoadingAllTracks = isLoadingTracks;
  const allTracksData = { tracks };
  
  // Song management (voting, adding songs)
  const {
    setlist,
    isConnected,
    selectedTrack,
    setSelectedTrack,
    handleVote,
    handleAddSong,
    anonymousVoteCount
  } = useSongManagement(id || '', initialSongs, isAuthenticated, login);
  
  // Compute available tracks with memoization to prevent recalculations
  const availableTracks = useMemo(() => {
    if (storedTracksData && Array.isArray(storedTracksData) && storedTracksData.length > 0) {
      console.log(`Computing available tracks from ${storedTracksData.length} stored tracks`);
      const setlistIds = new Set((setlist || []).map(song => song.id));
      return storedTracksData.filter((track: any) => !setlistIds.has(track.id));
    }
    
    if (typeof getAvailableTracks === 'function') {
      console.log("Using getAvailableTracks function");
      return getAvailableTracks(setlist || []);
    }
    
    console.log("No available tracks found");
    return [];
  }, [storedTracksData, setlist, getAvailableTracks]);
  
  // Add song handler
  const handleAddSongClick = useCallback((trackId?: string) => {
    const trackToUse = trackId || selectedTrack;
    
    if (!trackToUse) {
      console.log("No track selected for adding");
      return;
    }
    
    if (storedTracksData && Array.isArray(storedTracksData) && storedTracksData.length > 0) {
      console.log(`Looking for track ${trackToUse} in ${storedTracksData.length} stored tracks`);
      const track = storedTracksData.find((t: any) => t.id === trackToUse);
      if (track) {
        console.log(`Found track to add: ${track.name}`);
        handleAddSong({ tracks: storedTracksData });
        return;
      }
    }
    
    if (allTracksData && allTracksData.tracks) {
      console.log(`Looking for track ${trackToUse} in allTracksData`);
      handleAddSong(allTracksData);
    }
  }, [storedTracksData, allTracksData, handleAddSong, selectedTrack]);
  
  return {
    show,
    setlist,
    loading: {
      show: isLoadingShow,
      tracks: isLoadingTracks,
      allTracks: isLoadingAllTracks
    },
    error: {
      show: isError ? showError : null
    },
    connected: isConnected,
    songManagement: {
      selectedTrack,
      setSelectedTrack,
      handleVote,
      handleAddSong: handleAddSongClick,
      anonymousVoteCount
    },
    availableTracks,
    documentMetadata,
    loadTracks
  };
}
