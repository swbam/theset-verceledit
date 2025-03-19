
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
  
  const { 
    show, 
    isLoadingShow, 
    isError, 
    showError, 
    spotifyArtistId 
  } = useShowDetails(id);
  
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
      
      const title = `${artistName} at ${venueName} in ${venueLocation} | ${formattedDate}`;
      const description = `Vote on ${artistName}'s setlist for their show at ${venueName} in ${venueLocation} on ${formattedDate}. Influence what songs they'll play live!`;
      
      document.title = `TheSet | ${title}`;
      
      const metaDescription = document.querySelector('meta[name="description"]');
      if (metaDescription) {
        metaDescription.setAttribute('content', description);
      }
    }
  }, [show, isLoadingShow]);
  
  useEffect(() => {
    if (!isLoadingShow && isError && showError) {
      console.error("Show detail error:", showError);
      toast.error("Could not find show details. Returning to shows page.");
      
      // Add a small delay before navigating to allow the toast to be seen
      const timer = setTimeout(() => {
        navigate('/shows', { replace: true });
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [show, isLoadingShow, isError, showError, navigate]);
  
  // Optimize track loading with better caching
  const { 
    initialSongs, 
    isLoadingTracks, 
    isLoadingAllTracks, 
    allTracksData,
    getAvailableTracks,
    storedTracksData
  } = useArtistTracks(spotifyArtistId, isLoadingShow);
  
  const {
    setlist,
    isConnected,
    selectedTrack,
    setSelectedTrack,
    handleVote,
    handleAddSong,
    anonymousVoteCount
  } = useSongManagement(id || '', initialSongs, isAuthenticated, login);
  
  // Show partial content with loading indicators
  const renderPartialContent = () => {
    if (!show) return <ShowDetailSkeleton />;
    
    return (
      <div className="min-h-screen flex flex-col bg-black">
        <Navbar />
        
        <main className="flex-grow">
          <ShowHeader show={show} />
          <SetlistSection 
            setlist={setlist || []}
            isConnected={isConnected}
            isLoadingTracks={isLoadingTracks}
            handleVote={handleVote}
            showId={id || ''}
            showName={show.name || ''}
            artistName={show.artist?.name || 'Artist'}
            availableTracks={[]} // Empty during loading
            isLoadingAllTracks={isLoadingAllTracks}
            selectedTrack={selectedTrack}
            setSelectedTrack={setSelectedTrack}
            handleAddSong={handleAddSong}
            anonymousVoteCount={anonymousVoteCount}
          />
        </main>
        
        <Footer />
      </div>
    );
  };
  
  // Compute available tracks with memoization to prevent recalculations
  const availableTracks = React.useMemo(() => {
    if (storedTracksData && Array.isArray(storedTracksData) && storedTracksData.length > 0) {
      const setlistIds = new Set((setlist || []).map(song => song.id));
      return storedTracksData.filter((track: any) => !setlistIds.has(track.id));
    }
    
    if (typeof getAvailableTracks === 'function') {
      return getAvailableTracks(setlist || []);
    }
    
    return [];
  }, [storedTracksData, setlist, getAvailableTracks]);
  
  const handleAddSongClick = () => {
    if (storedTracksData && Array.isArray(storedTracksData) && storedTracksData.length > 0) {
      handleAddSong({ tracks: storedTracksData });
    } else if (allTracksData && allTracksData.tracks) {
      handleAddSong(allTracksData);
    } else {
      toast.error("No tracks available to add");
    }
  };
  
  // Show loading state while fetching show details
  if (isLoadingShow && !show) {
    return <ShowDetailSkeleton />;
  }
  
  // Show partial content while fetching additional data
  if (isLoadingTracks && !setlist?.length) {
    return renderPartialContent();
  }
  
  // Handle error states with fallback UI
  if (isError || !show) {
    return <ShowNotFound />;
  }
  
  return (
    <div className="min-h-screen flex flex-col bg-black">
      <Navbar />
      
      <main className="flex-grow">
        <ShowHeader show={show} />
        <SetlistSection 
          setlist={setlist || []}
          isConnected={isConnected}
          isLoadingTracks={isLoadingTracks}
          handleVote={handleVote}
          showId={id || ''}
          showName={show.name || ''}
          artistName={show.artist?.name || 'Artist'}
          availableTracks={availableTracks || []}
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
