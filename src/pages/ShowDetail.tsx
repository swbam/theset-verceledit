
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
  
  // Check if ID is one of our mock shows
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
  
  // For Spotify integration, generate an artist ID from the name
  const getSpotifyArtistId = (artistName: string | undefined) => {
    if (!artistName) return null;
    
    // Handle common artists for demo purposes
    const lowerName = artistName.toLowerCase();
    if (lowerName.includes('taylor swift')) return 'spotify-taylor-swift';
    if (lowerName.includes('beyonce') || lowerName.includes('beyoncé')) return 'spotify-beyonce';
    if (lowerName.includes('kendrick lamar')) return 'spotify-kendrick-lamar';
    if (lowerName.includes('dua lipa')) return 'spotify-dua-lipa';
    if (lowerName.includes('ed sheeran')) return 'spotify-ed-sheeran';
    
    // Generate a generic ID for other artists
    return `spotify-${artistName.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '')}`;
  };
  
  const spotifyArtistId = getSpotifyArtistId(show?.artist?.name);
  
  // Fetch artist's top tracks to use as setlist
  const {
    data: topTracksData,
    isLoading: isLoadingTracks,
    error: tracksError
  } = useQuery({
    queryKey: ['artistTopTracks', spotifyArtistId],
    queryFn: async () => {
      if (!spotifyArtistId) throw new Error("Artist ID is required");
      
      try {
        // For demo, we'll use mock data for certain artists
        if (spotifyArtistId.includes('spotify-')) {
          console.log("Using mock track data for:", spotifyArtistId);
          
          // Create realistic mock data based on artist
          const mockTracks = [];
          const artistName = show?.artist?.name || 'Artist';
          
          // Different mock track lists based on the artist
          if (spotifyArtistId === 'spotify-taylor-swift') {
            mockTracks.push(
              { id: 'track-1', name: 'Cruel Summer', popularity: 98 },
              { id: 'track-2', name: 'Anti-Hero', popularity: 96 },
              { id: 'track-3', name: 'Blank Space', popularity: 95 },
              { id: 'track-4', name: 'Shake It Off', popularity: 94 },
              { id: 'track-5', name: 'Love Story', popularity: 92 },
              { id: 'track-6', name: 'You Belong With Me', popularity: 91 },
              { id: 'track-7', name: 'Cardigan', popularity: 90 },
              { id: 'track-8', name: 'Wildest Dreams', popularity: 88 },
              { id: 'track-9', name: 'All Too Well', popularity: 87 },
              { id: 'track-10', name: 'Lover', popularity: 86 }
            );
          } else if (spotifyArtistId === 'spotify-beyonce') {
            mockTracks.push(
              { id: 'track-1', name: 'Single Ladies', popularity: 97 },
              { id: 'track-2', name: 'Halo', popularity: 96 },
              { id: 'track-3', name: 'Crazy in Love', popularity: 95 },
              { id: 'track-4', name: 'Formation', popularity: 93 },
              { id: 'track-5', name: 'Run the World (Girls)', popularity: 92 },
              { id: 'track-6', name: 'Irreplaceable', popularity: 90 },
              { id: 'track-7', name: 'If I Were a Boy', popularity: 89 },
              { id: 'track-8', name: 'Love On Top', popularity: 88 },
              { id: 'track-9', name: 'Drunk in Love', popularity: 87 },
              { id: 'track-10', name: 'Countdown', popularity: 85 }
            );
          } else if (spotifyArtistId === 'spotify-kendrick-lamar') {
            mockTracks.push(
              { id: 'track-1', name: 'HUMBLE.', popularity: 98 },
              { id: 'track-2', name: 'Alright', popularity: 96 },
              { id: 'track-3', name: 'DNA.', popularity: 95 },
              { id: 'track-4', name: 'Swimming Pools (Drank)', popularity: 93 },
              { id: 'track-5', name: 'm.A.A.d city', popularity: 92 },
              { id: 'track-6', name: 'LOYALTY.', popularity: 91 },
              { id: 'track-7', name: 'Money Trees', popularity: 90 },
              { id: 'track-8', name: 'King Kunta', popularity: 89 },
              { id: 'track-9', name: 'Bitch, Don\'t Kill My Vibe', popularity: 88 },
              { id: 'track-10', name: 'N95', popularity: 87 }
            );
          } else if (spotifyArtistId === 'spotify-dua-lipa') {
            mockTracks.push(
              { id: 'track-1', name: 'Don\'t Start Now', popularity: 98 },
              { id: 'track-2', name: 'Levitating', popularity: 97 },
              { id: 'track-3', name: 'New Rules', popularity: 96 },
              { id: 'track-4', name: 'One Kiss', popularity: 95 },
              { id: 'track-5', name: 'Physical', popularity: 94 },
              { id: 'track-6', name: 'Break My Heart', popularity: 92 },
              { id: 'track-7', name: 'IDGAF', popularity: 91 },
              { id: 'track-8', name: 'Hallucinate', popularity: 90 },
              { id: 'track-9', name: 'Electricity', popularity: 89 },
              { id: 'track-10', name: 'Be the One', popularity: 87 }
            );
          } else {
            // Generic track list for other artists
            for (let i = 1; i <= 10; i++) {
              mockTracks.push({
                id: `track-${i}`,
                name: `${artistName} Hit ${i}`,
                popularity: 100 - i * 2
              });
            }
          }
          
          return { tracks: mockTracks };
        }
        
        // For real implementation, use the Spotify API
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
      // Generate realistic vote numbers for demo purposes
      votes: track.popularity ? Math.floor(track.popularity / 20) : Math.floor(Math.random() * 5),
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
