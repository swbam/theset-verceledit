
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
  
  // Fetch show details
  const { 
    data: show, 
    isLoading: isLoadingShow,
    error: showError
  } = useQuery({
    queryKey: ['show', id],
    queryFn: () => fetchShowDetails(id!),
    enabled: !!id,
  });
  
  // Redirect if show not found
  useEffect(() => {
    if (!isLoadingShow && !show && showError) {
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
    isLoading: isLoadingTracks
  } = useQuery({
    queryKey: ['artistTopTracks', spotifyArtistId],
    queryFn: () => {
      // In a real app, this would be a proper Spotify ID
      // For demo purposes, we'll return mock data
      return {
        tracks: [
          { id: 'track1', name: 'Hit Song 1' },
          { id: 'track2', name: 'Greatest Hit' },
          { id: 'track3', name: 'Fan Favorite' },
          { id: 'track4', name: 'Classic Track' },
          { id: 'track5', name: 'New Single' },
          { id: 'track6', name: 'Deep Cut' },
          { id: 'track7', name: 'B-Side' },
          { id: 'track8', name: 'Ballad' },
          { id: 'track9', name: 'Upbeat Number' },
          { id: 'track10', name: 'Encore Song' },
        ]
      };
    },
    enabled: !!show?.artist?.name,
  });
  
  // Prepare setlist data for the real-time voting
  const initialSongs = React.useMemo(() => {
    if (!topTracksData?.tracks) return [];
    
    // Convert top tracks to setlist items with vote count
    return topTracksData.tracks.map((track: any) => ({
      id: track.id,
      name: track.name,
      votes: Math.floor(Math.random() * 50), // Demo random votes
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
      toast.error('Please log in to vote');
      return;
    }
    voteForSong(songId);
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
