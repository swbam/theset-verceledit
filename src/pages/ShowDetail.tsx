
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { fetchShowDetails } from '@/lib/ticketmaster';
import { getArtistTopTracks, getArtistAllTracks } from '@/lib/spotify';
import { useRealtimeVotes } from '@/hooks/use-realtime-votes';
import { useAuth } from '@/contexts/AuthContext';
import ShowHeader from '@/components/shows/ShowHeader';
import SetlistSection from '@/components/shows/SetlistSection';
import ShowDetailSkeleton from '@/components/shows/ShowDetailSkeleton';
import ShowNotFound from '@/components/shows/ShowNotFound';

const ShowDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { isAuthenticated, login } = useAuth();
  const navigate = useNavigate();
  const [selectedTrack, setSelectedTrack] = useState<string>('');
  
  // Fetch show details from Ticketmaster
  const { 
    data: show, 
    isLoading: isLoadingShow,
    error: showError,
    isError
  } = useQuery({
    queryKey: ['show', id],
    queryFn: async () => {
      try {
        if (!id) throw new Error("Show ID is required");
        
        // Fetch the show details from Ticketmaster
        const showDetails = await fetchShowDetails(id);
        console.log("Show details fetched:", showDetails);
        return showDetails;
      } catch (error) {
        console.error("Error fetching show details:", error);
        throw error;
      }
    },
    enabled: !!id,
    retry: 1,
  });
  
  // Redirect if show not found
  useEffect(() => {
    if (!isLoadingShow && isError && showError) {
      toast.error("Could not find show details");
      navigate('/shows', { replace: true });
    }
  }, [show, isLoadingShow, isError, showError, navigate]);
  
  // Get Spotify artist ID from artist name
  const spotifyArtistId = show?.artist?.id || '';
  
  // Fetch artist's top tracks from Spotify to use as setlist (limited to 5)
  const {
    data: topTracksData,
    isLoading: isLoadingTracks,
    error: tracksError
  } = useQuery({
    queryKey: ['artistTopTracks', spotifyArtistId],
    queryFn: async () => {
      if (!spotifyArtistId) throw new Error("Artist ID is required");
      
      try {
        // Use the Spotify API to get artist's top 5 tracks
        const tracks = await getArtistTopTracks(spotifyArtistId, 5);
        return tracks;
      } catch (error) {
        console.error("Error fetching tracks:", error);
        // Instead of throwing, return a fallback
        return { tracks: generateFallbackTracks(show?.artist?.name || 'Unknown Artist', 5) };
      }
    },
    enabled: !!spotifyArtistId && !isLoadingShow,
    retry: 2,
  });

  // Fetch all tracks for the artist for the dropdown
  const {
    data: allTracksData,
    isLoading: isLoadingAllTracks
  } = useQuery({
    queryKey: ['artistAllTracks', spotifyArtistId],
    queryFn: async () => {
      if (!spotifyArtistId) throw new Error("Artist ID is required");
      
      try {
        // Use the Spotify API to get all artist's tracks
        const tracks = await getArtistAllTracks(spotifyArtistId);
        return tracks;
      } catch (error) {
        console.error("Error fetching all tracks:", error);
        return { tracks: [] };
      }
    },
    enabled: !!spotifyArtistId && !isLoadingShow,
    retry: 2,
  });
  
  // Generate fallback tracks if Spotify API fails
  const generateFallbackTracks = (artistName: string, count: number = 5) => {
    // Create sample placeholder tracks
    return Array(count).fill(0).map((_, i) => ({
      id: `fallback-${i}`,
      name: `${artistName} Song ${i + 1}`,
      popularity: Math.floor(Math.random() * 100)
    }));
  };
  
  // Prepare setlist data for the real-time voting
  const initialSongs = React.useMemo(() => {
    if (!topTracksData?.tracks) return [];
    
    // Convert top tracks to setlist items with vote count
    return topTracksData.tracks.map((track: any) => ({
      id: track.id,
      name: track.name,
      votes: track.popularity ? Math.floor(track.popularity / 20) : 0,
      userVoted: false // Start with user not having voted
    }));
  }, [topTracksData]);
  
  // Set up real-time voting
  const {
    songs: setlist,
    isConnected,
    voteForSong,
    addSongToSetlist
  } = useRealtimeVotes({
    showId: id || '',
    initialSongs
  });
  
  // Handle voting on a song
  const handleVote = (songId: string) => {
    // If not authenticated, prompt to log in
    if (!isAuthenticated) {
      toast.error("Please log in to vote on setlists", {
        action: {
          label: "Log in",
          onClick: login
        }
      });
      return;
    }
    
    // Process the vote
    voteForSong(songId);
    toast.success("Your vote has been counted!");
  };

  // Handle adding a new song to the setlist
  const handleAddSong = () => {
    if (!selectedTrack) return;

    // Find the track in the all tracks data
    const trackToAdd = allTracksData?.tracks?.find((track: any) => track.id === selectedTrack);
    
    if (trackToAdd) {
      addSongToSetlist({
        id: trackToAdd.id,
        name: trackToAdd.name,
        votes: 1, // Start with 1 vote since the user is adding it
        userVoted: true
      });
      
      setSelectedTrack(''); // Reset selection
      toast.success(`"${trackToAdd.name}" added to setlist!`);
    }
  };

  // Filter out tracks that are already in the setlist
  const availableTracks = React.useMemo(() => {
    if (!allTracksData?.tracks || !setlist) return [];
    
    // Get IDs of songs already in the setlist
    const setlistIds = new Set(setlist.map(song => song.id));
    
    // Filter and sort alphabetically
    return allTracksData.tracks
      .filter((track: any) => !setlistIds.has(track.id))
      .sort((a: any, b: any) => a.name.localeCompare(b.name));
  }, [allTracksData, setlist]);
  
  if (isLoadingShow) {
    return <ShowDetailSkeleton />;
  }
  
  if (isError || !show) {
    return <ShowNotFound />;
  }
  
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <main className="flex-grow">
        <ShowHeader show={show} />
        <SetlistSection 
          setlist={setlist}
          isConnected={isConnected}
          isLoadingTracks={isLoadingTracks}
          handleVote={handleVote}
          showId={id}
          showName={show.name}
          artistName={show.artist?.name || 'Artist'}
          availableTracks={availableTracks}
          isLoadingAllTracks={isLoadingAllTracks}
          selectedTrack={selectedTrack}
          setSelectedTrack={setSelectedTrack}
          handleAddSong={handleAddSong}
        />
      </main>
      
      <Footer />
    </div>
  );
};

export default ShowDetail;
