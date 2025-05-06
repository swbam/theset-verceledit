import { useState, useEffect, useMemo, useCallback } from 'react';
import { useShowDetails } from '@/hooks/use-show-details';
import { useSongManagement } from '@/hooks/use-song-management';
import { useAuth } from '@/contexts/auth';
import { supabase } from '@/integrations/supabase/client';
import { isPast } from 'date-fns';
import { Song } from '@/lib/types';
import { useArtistSongs } from '@/hooks/use-artist-songs';

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
  
  // Get artist songs with optimized settings:
  // - enabled by default
  // - uses stored songs from database
  const artistSongsResponse = useArtistSongs(
    spotifyArtistId,
    { enabled: true }
  );

  // Function to load songs manually when needed
  const loadSongs = useCallback(() => {
    if (artistSongsResponse.refetch) {
      artistSongsResponse.refetch();
    }
  }, [artistSongsResponse]);

  const songs = artistSongsResponse?.songs || [];
  const isLoadingSongs = artistSongsResponse?.isLoading || false;
  const isSongsError = artistSongsResponse?.isError || false;
  const songsError = artistSongsResponse?.error || null;
  const storedSongsData = artistSongsResponse?.storedSongsData || [];
  const getAvailableSongs = artistSongsResponse?.getAvailableSongs || ((setlist: any[]) => []);

  // Loading states
  const isLoadingAllSongs = isLoadingSongs;
  const allSongsData = { songs };
  
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
      songs
        .filter((song): song is Song & { id: string } => song.id !== undefined) // Type guard to ensure id is string
        .map(song => ({ ...song, votes: 0, userVoted: false })),
      isAuthenticated,
      login
    );

  // Compute available songs directly
  const availableSongs = (storedSongsData || [])
    .filter((song: any) => {
      if (!song?.id) return false;
      const isInSetlist = setlist.some((s: any) => s.song_id === song.id);
      return !isInSetlist;
    });
  
  // Optimized add song handler with better error handling
  const handleAddSongClick = useCallback((songId?: string) => {
    const songToUse = songId || selectedTrack;
    
    if (!songToUse) {
      return;
    }
    
    if (storedSongsData && Array.isArray(storedSongsData) && storedSongsData.length > 0) {
      const song = storedSongsData.find((s: any) => s.id === songToUse);
      if (song) {
        handleAddSong({ songs: storedSongsData });
        return;
      }
    }
    
    if (allSongsData && allSongsData.songs) {
      handleAddSong(allSongsData);
    }
  }, [storedSongsData, allSongsData, handleAddSong, selectedTrack]);
  
  return {
    show,
    setlist,
    loading: {
      show: isLoadingShow,
      songs: isLoadingSongs,
      allSongs: isLoadingAllSongs
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
    availableSongs,
    documentMetadata,
    loadSongs,
    isPastShow, // Return the flag
    playedSetlist, // Return the played setlist
    isLoadingPlayedSetlist // Return loading state for played setlist
  };
}
