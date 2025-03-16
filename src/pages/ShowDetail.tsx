
import React, { useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Calendar, MapPin, ExternalLink, Music } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import VotableSetlistTable from '@/components/setlist/VotableSetlistTable';
import { Button } from '@/components/ui/button';
import { fetchShowDetails } from '@/lib/ticketmaster';
import { getArtistTopTracks } from '@/lib/spotify';
import { useRealtimeVotes } from '@/hooks/use-realtime-votes';
import { useAuth } from '@/contexts/AuthContext';

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
  
  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      month: 'long', 
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    }).format(date);
  };
  
  // Handle voting on a song
  const handleVote = (songId: string) => {
    if (!isAuthenticated) {
      toast.error('Please log in to vote');
      return;
    }
    voteForSong(songId);
  };
  
  if (isLoadingShow) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-grow px-6 md:px-8 lg:px-12 py-12">
          <div className="max-w-7xl mx-auto">
            <div className="animate-pulse space-y-8">
              <div className="h-8 bg-secondary rounded w-1/4"></div>
              <div className="h-12 bg-secondary rounded w-3/4"></div>
              <div className="h-64 bg-secondary rounded"></div>
              <div className="h-96 bg-secondary rounded"></div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }
  
  if (showError || !show) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-grow px-6 md:px-8 lg:px-12 py-12">
          <div className="max-w-7xl mx-auto text-center">
            <h1 className="text-2xl font-bold mb-4">Show not found</h1>
            <p className="text-muted-foreground mb-6">
              We couldn't find the show you're looking for.
            </p>
            <Link to="/shows" className="text-primary hover:underline flex items-center justify-center">
              <ArrowLeft size={16} className="mr-2" />
              Back to shows
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }
  
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <main className="flex-grow">
        {/* Show header section */}
        <section 
          className="relative bg-cover bg-center"
          style={{
            backgroundImage: show.image_url ? `linear-gradient(to bottom, rgba(0,0,0,0.7), rgba(0,0,0,0.4)), url(${show.image_url})` : undefined,
            backgroundColor: 'rgba(0,0,0,0.8)'
          }}
        >
          <div className="px-6 md:px-8 lg:px-12 py-20 relative z-10">
            <div className="max-w-7xl mx-auto">
              <Link to={`/artists/${show.artist?.id}`} className="text-white/80 hover:text-white inline-flex items-center mb-4 transition-colors">
                <ArrowLeft size={16} className="mr-2" />
                Back to artist
              </Link>
              
              <div className="mb-2">
                <span className="inline-block bg-primary/20 text-primary-foreground text-xs px-3 py-1 rounded-full">
                  {new Date(show.date) > new Date() ? 'Upcoming' : 'Past'}
                </span>
              </div>
              
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-3">{show.name}</h1>
              
              <p className="text-lg text-white/80 mb-6">{show.artist?.name}</p>
              
              <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-8 mt-6">
                <div className="flex items-center text-white/90">
                  <Calendar size={18} className="mr-2" />
                  {formatDate(show.date)}
                </div>
                
                <div className="flex items-center text-white/90">
                  <MapPin size={18} className="mr-2" />
                  {show.venue?.name}, {show.venue?.city}, {show.venue?.state}
                </div>
              </div>
              
              {show.ticket_url && (
                <div className="mt-8">
                  <Button asChild className="bg-primary hover:bg-primary/90">
                    <a 
                      href={show.ticket_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center"
                    >
                      <span>Get Tickets</span>
                      <ExternalLink size={16} className="ml-2" />
                    </a>
                  </Button>
                </div>
              )}
            </div>
          </div>
        </section>
        
        {/* Setlist section */}
        <section className="px-6 md:px-8 lg:px-12 py-12">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between mb-8">
              <div>
                <h2 className="text-2xl md:text-3xl font-bold">Setlist Voting</h2>
                <p className="text-muted-foreground mt-1">Vote for songs you want to hear at this show</p>
              </div>
              
              <div className="flex items-center mt-4 md:mt-0">
                {isConnected && (
                  <span className="text-xs bg-green-500/10 text-green-500 px-2 py-1 rounded-full flex items-center">
                    <span className="inline-block w-2 h-2 bg-green-500 rounded-full mr-1"></span>
                    Live updates
                  </span>
                )}
                <p className="text-sm text-muted-foreground ml-3">
                  Last updated {formatDistanceToNow(new Date(), { addSuffix: true })}
                </p>
              </div>
            </div>
            
            {isLoadingTracks ? (
              <div className="animate-pulse space-y-4 border border-border rounded-xl p-6">
                <div className="h-8 bg-secondary rounded w-full max-w-md"></div>
                <div className="h-8 bg-secondary rounded w-full max-w-lg"></div>
                <div className="h-8 bg-secondary rounded w-full max-w-sm"></div>
                <div className="h-8 bg-secondary rounded w-full max-w-lg"></div>
              </div>
            ) : setlist.length === 0 ? (
              <div className="text-center p-12 border border-border rounded-xl">
                <Music className="mx-auto mb-4 text-muted-foreground h-10 w-10" />
                <h3 className="text-xl font-medium mb-2">No setlist available</h3>
                <p className="text-muted-foreground">
                  Check back later for setlist information
                </p>
              </div>
            ) : (
              <div className="border border-border rounded-xl overflow-hidden">
                <VotableSetlistTable 
                  songs={setlist} 
                  onVote={handleVote} 
                  className="animate-fade-in"
                />
              </div>
            )}
            
            <div className="mt-8 p-4 bg-secondary/30 rounded-lg text-sm text-muted-foreground">
              <p>
                <strong>How voting works:</strong> Vote for songs you want to hear at this show. 
                Artists and promoters can see these votes to help plan setlists. You can only vote for each song once.
              </p>
            </div>
          </div>
        </section>
      </main>
      
      <Footer />
    </div>
  );
};

export default ShowDetail;
