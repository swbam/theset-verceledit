
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { fetchShowDetails } from '@/lib/ticketmaster';
import { getArtistTopTracks, getArtistAllTracks, resolveArtistId, searchArtists } from '@/lib/spotify';
import { useRealtimeVotes } from '@/hooks/use-realtime-votes';
import { useAuth } from '@/contexts/auth';
import ShowHeader from '@/components/shows/ShowHeader';
import SetlistSection from '@/components/shows/SetlistSection';
import ShowDetailSkeleton from '@/components/shows/ShowDetailSkeleton';
import ShowNotFound from '@/components/shows/ShowNotFound';
import { supabase } from '@/integrations/supabase/client';

const ShowDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { isAuthenticated, login } = useAuth();
  const navigate = useNavigate();
  const [selectedTrack, setSelectedTrack] = useState<string>('');
  const [spotifyArtistId, setSpotifyArtistId] = useState<string>('');
  
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);
  
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
        
        const showDetails = await fetchShowDetails(id);
        console.log("Show details fetched:", showDetails);
        
        // Fix for Spotify artist ID - search by name instead of using Ticketmaster ID
        if (showDetails?.artist?.name) {
          try {
            const artistResult = await searchArtists(showDetails.artist.name, 1);
            if (artistResult?.artists?.items && artistResult.artists.items.length > 0) {
              const spotifyId = artistResult.artists.items[0].id;
              setSpotifyArtistId(spotifyId);
              console.log(`Set Spotify artist ID from search: ${spotifyId}`);
            } else {
              console.log("No Spotify artist found with name:", showDetails.artist.name);
              // Set mock ID to allow for mock data fallback
              setSpotifyArtistId('mock-artist');
            }
          } catch (error) {
            console.error("Error searching for artist by name:", error);
            // Set mock ID to allow for mock data fallback
            setSpotifyArtistId('mock-artist');
          }
        }
        
        return showDetails;
      } catch (error) {
        console.error("Error fetching show details:", error);
        throw error;
      }
    },
    enabled: !!id,
    retry: 1,
  });
  
  useEffect(() => {
    if (!isLoadingShow && isError && showError) {
      toast.error("Could not find show details");
      navigate('/shows', { replace: true });
    }
  }, [show, isLoadingShow, isError, showError, navigate]);
  
  const {
    data: storedArtistData,
    isLoading: isLoadingStoredData
  } = useQuery({
    queryKey: ['storedArtistData', spotifyArtistId],
    queryFn: async () => {
      if (!spotifyArtistId) return null;
      
      const { data, error } = await supabase
        .from('artists')
        .select('id, stored_tracks')
        .eq('id', spotifyArtistId)
        .maybeSingle();
      
      if (error) {
        console.error("Error fetching stored artist data:", error);
        return null;
      }
      
      console.log(`Stored artist data for ${spotifyArtistId}:`, data);
      return data;
    },
    enabled: !!spotifyArtistId && !isLoadingShow,
  });
  
  const {
    data: topTracksData,
    isLoading: isLoadingTracks,
    error: tracksError
  } = useQuery({
    queryKey: ['artistTopTracks', spotifyArtistId],
    queryFn: async () => {
      console.log(`Fetching top tracks for artist ID: ${spotifyArtistId}`);
      if (!spotifyArtistId) {
        console.error("No valid Spotify artist ID available");
        return { tracks: [] };
      }
      
      try {
        const tracks = await getArtistTopTracks(spotifyArtistId, 5);
        console.log(`Fetched ${tracks.tracks?.length || 0} top tracks`);
        return tracks;
      } catch (error) {
        console.error("Error fetching tracks:", error);
        // Return some mock data if the API fails
        return { 
          tracks: [
            { id: 'mock1', name: 'Track 1', popularity: 80 },
            { id: 'mock2', name: 'Track 2', popularity: 75 },
            { id: 'mock3', name: 'Track 3', popularity: 70 },
            { id: 'mock4', name: 'Track 4', popularity: 65 },
            { id: 'mock5', name: 'Track 5', popularity: 60 }
          ] 
        };
      }
    },
    enabled: !!spotifyArtistId && !isLoadingShow,
    retry: 2,
  });

  const {
    data: allTracksData,
    isLoading: isLoadingAllTracks
  } = useQuery({
    queryKey: ['artistAllTracks', spotifyArtistId],
    queryFn: async () => {
      if (!spotifyArtistId) {
        console.error("No valid Spotify artist ID available");
        return { tracks: [] };
      }
      
      if (storedArtistData?.stored_tracks && Array.isArray(storedArtistData.stored_tracks)) {
        console.log("Using stored tracks from database:", storedArtistData.stored_tracks.length);
        return { tracks: storedArtistData.stored_tracks };
      }
      
      try {
        const tracks = await getArtistAllTracks(spotifyArtistId);
        
        if (tracks && tracks.tracks && tracks.tracks.length > 0) {
          console.log(`Storing ${tracks.tracks.length} tracks in database for artist ${spotifyArtistId}`);
          const { error } = await supabase
            .from('artists')
            .update({ 
              stored_tracks: tracks.tracks,
              updated_at: new Date().toISOString()
            })
            .eq('id', spotifyArtistId);
          
          if (error) {
            console.error("Error storing tracks in database:", error);
          } else {
            console.log("Successfully stored tracks in database");
          }
        }
        
        return tracks;
      } catch (error) {
        console.error("Error fetching all tracks:", error);
        // Return some mock data if the API fails
        return { 
          tracks: [
            { id: 'mock1', name: 'Hit Song 1' },
            { id: 'mock2', name: 'Hit Song 2' },
            { id: 'mock3', name: 'Hit Song 3' },
            { id: 'mock4', name: 'Deep Cut 1' },
            { id: 'mock5', name: 'Deep Cut 2' },
            { id: 'mock6', name: 'Acoustic Version' },
            { id: 'mock7', name: 'Live Version' },
            { id: 'mock8', name: 'Remix' },
            { id: 'mock9', name: 'Extended Mix' },
            { id: 'mock10', name: 'Collaboration Track' }
          ] 
        };
      }
    },
    enabled: !!spotifyArtistId && !isLoadingShow && !isLoadingStoredData,
    retry: 2,
  });
  
  const initialSongs = React.useMemo(() => {
    if (!topTracksData?.tracks || !Array.isArray(topTracksData.tracks) || topTracksData.tracks.length === 0) {
      console.log("No top tracks data available or empty array");
      return [];
    }
    
    console.log(`Converting ${topTracksData.tracks.length} top tracks to setlist items`);
    
    return topTracksData.tracks.map((track: any) => ({
      id: track.id,
      name: track.name,
      votes: track.popularity ? Math.floor(track.popularity / 20) : 0,
      userVoted: false
    }));
  }, [topTracksData]);
  
  const {
    songs: setlist,
    isConnected,
    voteForSong,
    addSongToSetlist,
    anonymousVoteCount
  } = useRealtimeVotes({
    showId: id || '',
    initialSongs
  });
  
  const handleVote = (songId: string) => {
    const voteSuccess = voteForSong(songId, isAuthenticated);
    
    if (voteSuccess) {
      toast.success("Your vote has been counted!");
    } else if (!isAuthenticated && anonymousVoteCount >= 3) {
      // This will trigger a toast in the hook, but we also redirect to login
      setTimeout(() => {
        login();
      }, 2000);
    }
  };

  const handleAddSong = () => {
    if (!selectedTrack) return;

    const trackToAdd = allTracksData?.tracks?.find((track: any) => track.id === selectedTrack);
    
    if (trackToAdd) {
      addSongToSetlist({
        id: trackToAdd.id,
        name: trackToAdd.name,
        votes: 0,
        userVoted: false
      });
      
      setSelectedTrack('');
      toast.success(`"${trackToAdd.name}" added to setlist!`);
    }
  };

  const availableTracks = React.useMemo(() => {
    if (!allTracksData?.tracks || !Array.isArray(allTracksData.tracks) || !setlist) {
      console.log("No tracks available for filtering");
      return [];
    }
    
    const setlistIds = new Set(setlist.map(song => song.id));
    
    const filteredTracks = allTracksData.tracks
      .filter((track: any) => !setlistIds.has(track.id))
      .sort((a: any, b: any) => a.name.localeCompare(b.name));
    
    console.log(`${filteredTracks.length} tracks available after filtering out ${setlist.length} setlist tracks`);
    return filteredTracks;
  }, [allTracksData, setlist]);
  
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
          handleAddSong={handleAddSong}
          anonymousVoteCount={anonymousVoteCount}
        />
      </main>
      
      <Footer />
    </div>
  );
};

export default ShowDetail;
