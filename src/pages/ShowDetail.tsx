
import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { useAuth } from '@/contexts/auth';
import ShowHeader from '@/components/shows/ShowHeader';
import SetlistSection from '@/components/shows/SetlistSection';
import ShowDetailSkeleton from '@/components/shows/ShowDetailSkeleton';
import ShowNotFound from '@/components/shows/ShowNotFound';
import { useShowDetails } from '@/hooks/use-show-details';
import { useArtistTracks } from '@/hooks/use-artist-tracks';
import { useSongManagement } from '@/hooks/use-song-management';

const ShowDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { isAuthenticated, login } = useAuth();
  const navigate = useNavigate();
  
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);
  
  // Fetch show details
  const { 
    show, 
    isLoadingShow, 
    isError, 
    showError, 
    spotifyArtistId 
  } = useShowDetails(id);
  
  // Handle navigation on error
  useEffect(() => {
    if (!isLoadingShow && isError && showError) {
      toast.error("Could not find show details");
      navigate('/shows', { replace: true });
    }
  }, [show, isLoadingShow, isError, showError, navigate]);
  
  // Fetch artist tracks
  const { 
    initialSongs, 
    isLoadingTracks, 
    isLoadingAllTracks, 
    allTracksData,
    getAvailableTracks
  } = useArtistTracks(spotifyArtistId, isLoadingShow);
  
  // Manage songs and voting
  const {
    setlist,
    isConnected,
    selectedTrack,
    setSelectedTrack,
    handleVote,
    handleAddSong,
    anonymousVoteCount
  } = useSongManagement(id || '', initialSongs, isAuthenticated, login);
  
  // Calculate available tracks for dropdown
  const availableTracks = React.useMemo(() => {
    return getAvailableTracks(setlist);
  }, [allTracksData, setlist, getAvailableTracks]);
  
  // Handle song addition
  const handleAddSongClick = () => {
    handleAddSong(allTracksData);
  };
  
  if (isLoadingShow) {
    return <ShowDetailSkeleton />;
  }
  
  if (isError || !show) {
    return <ShowNotFound />;
  }
  
  return (
    <div className="min-h-screen flex flex-col bg-black">
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
          handleAddSong={handleAddSongClick}
          anonymousVoteCount={anonymousVoteCount}
        />
      </main>
      
      <Footer />
    </div>
  );
};

export default ShowDetail;
