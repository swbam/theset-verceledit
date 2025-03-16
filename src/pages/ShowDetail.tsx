
import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { fetchShowDetails } from '@/lib/ticketmaster';
import { getArtistTopTracks } from '@/lib/spotify';
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
        toast.success("Show details loaded");
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
  
  // Fetch artist's top tracks from Spotify to use as setlist
  const {
    data: topTracksData,
    isLoading: isLoadingTracks,
    error: tracksError
  } = useQuery({
    queryKey: ['artistTopTracks', spotifyArtistId],
    queryFn: async () => {
      if (!spotifyArtistId) throw new Error("Artist ID is required");
      
      try {
        // Use the Spotify API to get artist's top tracks
        return await getArtistTopTracks(spotifyArtistId);
      } catch (error) {
        console.error("Error fetching tracks:", error);
        toast.error("Failed to load artist tracks");
        throw error;
      }
    },
    enabled: !!spotifyArtistId && !isLoadingShow,
  });
  
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
    voteForSong
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
        />
      </main>
      
      <Footer />
    </div>
  );
};

export default ShowDetail;
