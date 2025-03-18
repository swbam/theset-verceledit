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
import { useDocumentTitle } from '@/hooks/use-document-title';

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
  
  // Set document title with appropriate format
  useEffect(() => {
    if (show && !isLoadingShow) {
      const artistName = show.artist?.name || 'Artist';
      const venueName = show.venue?.name || 'Venue';
      const venueCity = show.venue?.city || '';
      const venueState = show.venue?.state || '';
      const venueLocation = venueCity && venueState ? `${venueCity}, ${venueState}` : (venueCity || venueState || 'Location');
      
      // Format date
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
      
      // Update meta description
      const metaDescription = document.querySelector('meta[name="description"]');
      if (metaDescription) {
        metaDescription.setAttribute('content', description);
      }
    }
  }, [show, isLoadingShow]);
  
  // Handle navigation on error
  useEffect(() => {
    if (!isLoadingShow && isError && showError) {
      toast.error("Could not find show details");
      navigate('/shows', { replace: true });
    }
  }, [show, isLoadingShow, isError, showError, navigate]);
  
  // Fetch artist tracks - this will prioritize stored tracks before making API calls
  const { 
    initialSongs, 
    isLoadingTracks, 
    isLoadingAllTracks, 
    allTracksData,
    getAvailableTracks,
    storedTracksData
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
  
  console.log("Current setlist length:", setlist.length);
  console.log("Is loading tracks:", isLoadingTracks);
  console.log("Is loading all tracks:", isLoadingAllTracks);
  console.log("Initial songs length:", initialSongs.length);
  console.log("All tracks data length:", allTracksData?.tracks?.length);
  console.log("Stored tracks data length:", storedTracksData?.length);
  
  // Calculate available tracks for dropdown - prioritize stored tracks
  const availableTracks = React.useMemo(() => {
    // Log the current state to debug
    console.log("Calculating available tracks. Current setlist:", setlist.length);
    
    // If we have stored tracks, use those instead of allTracksData
    if (storedTracksData && Array.isArray(storedTracksData) && storedTracksData.length > 0) {
      console.log("Using stored tracks for available tracks list:", storedTracksData.length);
      const setlistIds = new Set(setlist.map(song => song.id));
      return storedTracksData.filter((track: any) => !setlistIds.has(track.id));
    }
    
    // Otherwise use the standard function with allTracksData
    return getAvailableTracks(setlist);
  }, [storedTracksData, allTracksData, setlist, getAvailableTracks]);
  
  // Handle song addition
  const handleAddSongClick = () => {
    // If we have stored tracks, wrap them in the expected format
    if (storedTracksData && Array.isArray(storedTracksData) && storedTracksData.length > 0) {
      console.log("Adding song using stored tracks data:", storedTracksData.length);
      handleAddSong({ tracks: storedTracksData });
    } else {
      console.log("Add song clicked, passing all tracks data:", allTracksData?.tracks?.length);
      handleAddSong(allTracksData);
    }
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
