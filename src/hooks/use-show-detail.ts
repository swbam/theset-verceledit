
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useShowDetails } from '@/hooks/use-show-details';
import { useArtistTracks } from '@/hooks/use-artist-tracks';
import { useSongManagement } from '@/hooks/use-song-management';
import { useAuth } from '@/contexts/auth';
import { supabase } from '@/integrations/supabase/client'; // Import supabase client
import { isPast } from 'date-fns'; // Import date-fns helper
import { Song } from '@/lib/types'; // Import Song type

export function useShowDetail(id: string | undefined) {
  const [documentMetadata, setDocumentMetadata] = useState({
    title: '',
    description: ''
  });
  const [isPastShow, setIsPastShow] = useState(false);
  const [playedSetlist, setPlayedSetlist] = useState<any[]>([]); // State for played setlist
  const [isLoadingPlayedSetlist, setIsLoadingPlayedSetlist] = useState(false);
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
      try {
        const artistName = show.artist?.name || 'Artist';
        const venueName = show.venue?.name || 'Venue';
        const venueCity = show.venue?.city || '';
        const venueState = show.venue?.state || '';
        const venueLocation = venueCity && venueState ? `${venueCity}, ${venueState}` : (venueCity || venueState || 'Location');
        
        let formattedDate = 'TBD';
        
        // Safely format the date
        if (show.date) {
          try {
            const showDate = new Date(show.date);
            
            // Check if date is valid
            if (!isNaN(showDate.getTime())) {
              formattedDate = showDate.toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short', 
                day: 'numeric', 
                year: 'numeric'
              });
            }
          } catch (dateError) {
            console.error('Error formatting show date:', dateError);
          }
        }
        
        const title = `TheSet | ${artistName} at ${venueName} in ${venueLocation} | ${formattedDate}`;
        const description = `Vote on ${artistName}'s setlist for their show at ${venueName} in ${venueLocation} on ${formattedDate}. Influence what songs they'll play live!`;
        
        setDocumentMetadata({
          title,
          description
        });
      } catch (error) {
        console.error('Error setting document metadata:', error);
        setDocumentMetadata({
          title: 'Show Details | TheSet',
          description: 'Vote on setlists for upcoming concerts and shows on TheSet.'
        });
      }
      // Check if show is in the past
      if (show?.date) {
        try {
          setIsPastShow(isPast(new Date(show.date)));
        } catch (e) {
          console.error("Error checking show date:", e);
          setIsPastShow(false); // Default to not past if date is invalid
        }
      } else {
        setIsPastShow(false); // Default if no date
      }
    }
  }, [show, isLoadingShow]);

  // Fetch played setlist if the show is in the past
  useEffect(() => {
    const fetchPlayedSetlist = async () => {
      if (isPastShow && show?.id) {
        setIsLoadingPlayedSetlist(true);
        try {
          // Find the setlist record linked to the show
          const { data: setlistRecord, error: setlistError } = await supabase
            .from('setlists')
            .select('id') // We need the setlist ID (PK, likely setlist.fm ID)
            .eq('show_id', show.id)
            .maybeSingle();

          if (setlistError) throw setlistError;

          if (setlistRecord?.id) {
            // Fetch the played songs using the setlist ID
            const { data: playedSongs, error: songsError } = await supabase
              .from('played_setlist_songs')
              .select(`
                position,
                info,
                is_encore,
                song:songs!song_id(id, name)
              `)
              .eq('setlist_id', setlistRecord.id)
              .order('position', { ascending: true });

            if (songsError) throw songsError;

            setPlayedSetlist(playedSongs || []);
          } else {
            setPlayedSetlist([]); // No setlist found for this show
          }
        } catch (error) {
          console.error("Error fetching played setlist:", error);
          setPlayedSetlist([]); // Set empty on error
        } finally {
          setIsLoadingPlayedSetlist(false);
        }
      } else {
        setPlayedSetlist([]); // Reset if not a past show
      }
    };

    fetchPlayedSetlist();
  }, [isPastShow, show?.id]);
  
  // Get artist tracks with optimized settings:
  // - staleTime set to 1 hour to better utilize cache
  // - immediate loading enabled
  // - prioritize stored tracks (Note: prioritizeStored option removed from useArtistTracks)
  const artistTracksResponse = useArtistTracks(
    show?.artist_id || undefined, // 1st arg: Internal Artist UUID
    // undefined,                 // Removed 2nd (unused) argument entirely
    { immediate: true }           // Now the 2nd argument is the options object
  );

  // Function to load tracks manually when needed
  const loadTracks = useCallback(() => {
    if (artistTracksResponse.refetch) {
      artistTracksResponse.refetch();
    }
  }, [artistTracksResponse]);
  
  // Extract all needed properties with defaults, ensuring response object exists
  const tracks = artistTracksResponse && 'tracks' in artistTracksResponse ? artistTracksResponse.tracks : [];
  const isLoadingTracks = artistTracksResponse && 'isLoading' in artistTracksResponse ? artistTracksResponse.isLoading : true; // Default to true if response is undefined
  const isTracksError = artistTracksResponse && 'isError' in artistTracksResponse ? artistTracksResponse.isError : false;
  const tracksError = artistTracksResponse && 'error' in artistTracksResponse ? artistTracksResponse.error : null;
  const initialSongs = artistTracksResponse && 'initialSongs' in artistTracksResponse ? artistTracksResponse.initialSongs : [];
  const storedTracksData = artistTracksResponse && 'storedTracksData' in artistTracksResponse ? artistTracksResponse.storedTracksData : [];
  const getAvailableTracks = artistTracksResponse && 'getAvailableTracks' in artistTracksResponse ? artistTracksResponse.getAvailableTracks : ((setlist: any[]) => []);
  
  // For backward compatibility
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
  } = useSongManagement(
      id || '',
      // Filter initialSongs to ensure 'id' is defined and map to add default vote properties
      initialSongs
        .filter((song): song is Song & { id: string } => song.id !== undefined) // Type guard to ensure id is string
        .map(song => ({ ...song, votes: 0, userVoted: false })),
      isAuthenticated,
      login
    );

  // Compute available tracks directly without useMemo
  // Type guard to ensure an object has a non-null, string 'id' property
  const hasStringId = (item: any): item is { id: string } => typeof item?.id === 'string';

  // Create a Set of IDs from the current setlist, filtering for valid IDs
  const setlistIds = new Set(
    (setlist || []).filter(hasStringId).map(song => song.id)
  );

  // Filter storedTracksData, ensuring track.id is defined before checking
  const availableTracks = (storedTracksData || [])
    .filter(hasStringId) // Ensure track has a string ID
    .filter(track => !setlistIds.has(track.id)); // Check against the Set
  
  // Optimized add song handler with better error handling
  const handleAddSongClick = useCallback((trackId?: string) => {
    const trackToUse = trackId || selectedTrack;
    
    if (!trackToUse) {
      return;
    }
    
    if (storedTracksData && Array.isArray(storedTracksData) && storedTracksData.length > 0) {
      const track = storedTracksData.find((t: any) => t.id === trackToUse);
      if (track) {
        handleAddSong({ tracks: storedTracksData });
        return;
      }
    }
    
    if (allTracksData && allTracksData.tracks) {
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
    loadTracks,
    isPastShow, // Return the flag
    playedSetlist, // Return the played setlist
    isLoadingPlayedSetlist // Return loading state for played setlist
  };
}
