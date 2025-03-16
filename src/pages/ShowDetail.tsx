
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
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  
  // Fetch show details (this will also create/update the show in the database)
  const { 
    data: show, 
    isLoading: isLoadingShow,
    error: showError
  } = useQuery({
    queryKey: ['show', id],
    queryFn: () => fetchShowDetails(id!),
    enabled: !!id,
    onSuccess: (data) => {
      console.log("Show details fetched and saved to database:", data);
      // In a real implementation, this would update the database or trigger events
      toast.success("Show details loaded");
    }
  });
  
  // Redirect if show not found
  useEffect(() => {
    if (!isLoadingShow && !show && showError) {
      toast.error("Could not find show details");
      navigate('/shows', { replace: true });
    }
  }, [show, isLoadingShow, showError, navigate]);
  
  // For demo purposes, we'll generate a Spotify artist ID from the artist name
  // In a real app, we would have a proper mapping or lookup
  const spotifyArtistId = show?.artist?.name 
    ? `spotify-${show.artist.name.toLowerCase().replace(/\s+/g, '-')}`
    : null;
  
  // Fetch artist's top tracks to use as setlist
  const {
    data: topTracksData,
    isLoading: isLoadingTracks,
    error: tracksError
  } = useQuery({
    queryKey: ['artistTopTracks', spotifyArtistId],
    queryFn: () => getArtistTopTracks(spotifyArtistId || 'demo-artist'),
    enabled: !!spotifyArtistId,
    onSuccess: (data) => {
      console.log("Artist top tracks fetched for setlist:", data);
      // In a real implementation, this would initialize the setlist in the database if it doesn't exist
    }
  });
  
  // Handle track fetch error
  useEffect(() => {
    if (tracksError) {
      console.error("Failed to load tracks:", tracksError);
      toast.error("Could not load artist tracks for setlist");
    }
  }, [tracksError]);
  
  // Prepare setlist data for the real-time voting
  const initialSongs = React.useMemo(() => {
    if (!topTracksData?.tracks) return [];
    
    // Convert top tracks to setlist items with vote count of 0
    return topTracksData.tracks.map((track: any) => ({
      id: track.id,
      name: track.name,
      votes: 0, // Start with 0 votes
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
    if (!isAuthenticated) {
      toast.error("Please log in to vote on setlists");
      return;
    }
    
    // Process the vote
    voteForSong(songId);
    toast.success("Your vote has been counted!");
  };
  
  if (isLoadingShow) {
    return <ShowDetailSkeleton />;
  }
  
  if (showError || !show) {
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
        />
      </main>
      
      <Footer />
    </div>
  );
};

export default ShowDetail;
