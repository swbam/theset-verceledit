
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
  
  // Fix for demo mock data - check if ID is one of our mock shows
  const isMockShow = id?.startsWith('show');
  
  // Fetch show details (this will also create/update the show in the database)
  const { 
    data: show, 
    isLoading: isLoadingShow,
    error: showError,
    isError
  } = useQuery({
    queryKey: ['show', id],
    queryFn: async () => {
      try {
        // For mock show IDs, return mock data
        if (isMockShow) {
          // Mock data for demo purposes
          const mockShow = {
            id: id,
            name: id === 'show1' ? 'The Eras Tour' : 
                  id === 'show2' ? 'World Tour' : 'Renaissance World Tour',
            date: new Date().toISOString(),
            artist: {
              id: id === 'show1' ? 'tm-taylor-swift' : 
                   id === 'show2' ? 'tm-kendrick-lamar' : 'tm-beyonce',
              name: id === 'show1' ? 'Taylor Swift' : 
                    id === 'show2' ? 'Kendrick Lamar' : 'Beyoncé'
            },
            venue: {
              id: 'venue-1',
              name: id === 'show1' ? 'Madison Square Garden' : 
                    id === 'show2' ? 'Staples Center' : 'Wembley Stadium',
              city: id === 'show1' ? 'New York' : 
                    id === 'show2' ? 'Los Angeles' : 'London',
              state: id === 'show1' ? 'NY' : 
                     id === 'show2' ? 'CA' : 'UK',
            },
            ticket_url: 'https://www.ticketmaster.com',
            image_url: id === 'show1' 
              ? 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=800&q=80'
              : id === 'show2'
                ? 'https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=800&q=80'
                : 'https://images.unsplash.com/photo-1565035010268-a3816f98589a?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=800&q=80'
          };
          console.log("Using mock show data:", mockShow);
          toast.info("Using demo show data for preview");
          return mockShow;
        }
        
        // Use the real API for non-mock shows
        if (!id) throw new Error("Show ID is required");
        
        // Fetch the actual show details from Ticketmaster
        const showDetails = await fetchShowDetails(id);
        console.log("Show details fetched and saved to database:", showDetails);
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
  
  // For demo purposes, we'll generate a Spotify artist ID from the artist name
  // In a real app, we would have a proper mapping or lookup
  const spotifyArtistId = show?.artist?.name 
    ? `spotify-${show.artist.name.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '')}`
    : null;
  
  // Fetch artist's top tracks to use as setlist
  const {
    data: topTracksData,
    isLoading: isLoadingTracks,
    error: tracksError
  } = useQuery({
    queryKey: ['artistTopTracks', spotifyArtistId],
    queryFn: () => {
      if (!spotifyArtistId) throw new Error("Artist ID is required");
      
      // For demo, we'll use mock data for certain artists
      if (spotifyArtistId === 'spotify-taylor-swift' || 
          spotifyArtistId === 'spotify-kendrick-lamar' || 
          spotifyArtistId === 'spotify-beyonce') {
        console.log("Using mock track data for:", spotifyArtistId);
        return {
          tracks: Array(10).fill(0).map((_, i) => ({
            id: `track-${i+1}`,
            name: `${show?.artist?.name} Hit Song ${i+1}`,
            popularity: 100 - i,
          }))
        };
      }
      
      return getArtistTopTracks(spotifyArtistId);
    },
    enabled: !!spotifyArtistId && !isLoadingShow,
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
      votes: Math.floor(Math.random() * 5), // Start with some random votes for demo
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
