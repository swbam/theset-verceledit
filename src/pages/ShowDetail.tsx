
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
  
  // Log the show ID on component mount for debugging
  useEffect(() => {
    console.log("ShowDetail component mounted with ID:", id);
  }, [id]);
  
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
  
  console.log("ShowDetail render state:", {
    showId: id,
    hasShow: !!show,
    isLoadingShow,
    spotifyArtistId,
    setlistLength: setlist?.length || 0,
    isLoadingTracks,
    isLoadingAllTracks,
    initialSongsLength: initialSongs?.length || 0,
    allTracksDataLength: allTracksData?.tracks?.length || 0,
    storedTracksDataLength: storedTracksData?.length || 0,
    isConnected
  });
  
  const availableTracks = React.useMemo(() => {
    console.log("Calculating available tracks. Current setlist:", setlist?.length || 0);
    
    if (storedTracksData && Array.isArray(storedTracksData) && storedTracksData.length > 0) {
      console.log("Using stored tracks for available tracks list:", storedTracksData.length);
      const setlistIds = new Set((setlist || []).map(song => song.id));
      return storedTracksData.filter((track: any) => !setlistIds.has(track.id));
    }
    
    return getAvailableTracks(setlist || []);
  }, [storedTracksData, allTracksData, setlist, getAvailableTracks]);
  
  const handleAddSongClick = () => {
    if (storedTracksData && Array.isArray(storedTracksData) && storedTracksData.length > 0) {
      console.log("Adding song using stored tracks data:", storedTracksData.length);
      handleAddSong({ tracks: storedTracksData });
    } else if (allTracksData && allTracksData.tracks) {
      console.log("Add song clicked, passing all tracks data:", allTracksData.tracks.length);
      handleAddSong(allTracksData);
    } else {
      console.log("No tracks available to add");
      toast.error("No tracks available to add");
    }
  };
  
  // Show loading state while fetching show details
  if (isLoadingShow) {
    return <ShowDetailSkeleton />;
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
