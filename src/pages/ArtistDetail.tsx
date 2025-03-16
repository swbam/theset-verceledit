
import React, { useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Music2, CalendarDays, ExternalLink, ArrowLeft } from 'lucide-react';
import { getArtistTopTracks } from '@/lib/spotify';
import { fetchArtistEvents } from '@/lib/ticketmaster';
import { cn } from '@/lib/utils';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import ShowCard from '@/components/shows/ShowCard';

const ArtistDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  // Extract artist name from ID (since we're using Ticketmaster, we encoded the name in the ID)
  const artistName = id ? decodeURIComponent(id.replace('tm-', '').replace(/-/g, ' ')) : '';
  
  // Fetch upcoming shows from Ticketmaster
  const {
    data: events = [],
    isLoading: isLoadingEvents,
    error: eventsError
  } = useQuery({
    queryKey: ['artistEvents', artistName],
    queryFn: () => fetchArtistEvents(artistName),
    enabled: !!artistName,
  });
  
  // If there are no events, redirect to search
  useEffect(() => {
    if (!isLoadingEvents && events.length === 0 && !eventsError) {
      navigate('/search', { replace: true });
    }
  }, [events, isLoadingEvents, eventsError, navigate]);
  
  // Get the first event to extract artist info
  const firstEvent = events[0];
  
  // Extract Spotify artist ID if available
  const spotifyArtistId = null; // In a real app, we would have a mapping or lookup from Ticketmaster to Spotify IDs
  
  // Fetch artist's top tracks from Spotify if we have an ID
  const { 
    data: topTracksData
  } = useQuery({
    queryKey: ['artistTopTracks', spotifyArtistId],
    queryFn: () => getArtistTopTracks(spotifyArtistId!),
    enabled: !!spotifyArtistId,
  });
  
  const topTracks = topTracksData?.tracks || [];
  const upcomingShows = events || [];
  
  if (isLoadingEvents) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-grow px-6 md:px-8 lg:px-12 py-12">
          <div className="max-w-7xl mx-auto">
            <div className="animate-pulse space-y-8">
              <div className="flex flex-col md:flex-row gap-8">
                <div className="w-48 h-48 rounded-xl bg-secondary"></div>
                <div className="space-y-4 flex-1">
                  <div className="h-10 bg-secondary rounded w-1/3"></div>
                  <div className="h-5 bg-secondary rounded w-1/4"></div>
                  <div className="h-4 bg-secondary rounded w-1/2 mt-4"></div>
                </div>
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }
  
  if (eventsError || events.length === 0) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-grow px-6 md:px-8 lg:px-12 py-12">
          <div className="max-w-7xl mx-auto text-center">
            <h1 className="text-2xl font-bold mb-4">Artist not found or no upcoming shows</h1>
            <p className="text-muted-foreground mb-6">
              We couldn't find any upcoming shows for this artist.
            </p>
            <Link to="/search" className="text-primary hover:underline flex items-center justify-center">
              <ArrowLeft size={16} className="mr-2" />
              Back to search
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }
  
  // Extract artist image from the first event
  const artistImage = firstEvent?.image_url;
  
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <main className="flex-grow">
        {/* Artist header section */}
        <section className="px-6 md:px-8 lg:px-12 py-12">
          <div className="max-w-7xl mx-auto">
            <Link to="/search" className="text-muted-foreground hover:text-foreground inline-flex items-center mb-6 transition-colors">
              <ArrowLeft size={16} className="mr-2" />
              Back to search
            </Link>
            
            <div className="flex flex-col md:flex-row gap-8">
              <div className="w-48 h-48 rounded-xl overflow-hidden bg-secondary shadow-sm">
                {artistImage ? (
                  <img 
                    src={artistImage} 
                    alt={artistName} 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <Music2 size={64} className="text-foreground/20" />
                  </div>
                )}
              </div>
              
              <div>
                <h1 className="text-3xl md:text-4xl font-bold">{artistName}</h1>
                
                <div className="mt-6">
                  <div className="inline-flex items-center bg-primary/10 text-primary px-3 py-1 rounded-full text-sm">
                    <CalendarDays size={14} className="mr-1" />
                    {upcomingShows.length} upcoming {upcomingShows.length === 1 ? 'show' : 'shows'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
        
        {/* Upcoming shows section */}
        <section className="px-6 md:px-8 lg:px-12 py-12 bg-secondary/50">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between mb-8">
              <div>
                <h2 className="text-2xl md:text-3xl font-bold">Upcoming Shows</h2>
                <p className="text-muted-foreground mt-1">Vote on setlists for upcoming shows</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {upcomingShows.map((show: any, index: number) => (
                <div 
                  key={show.id} 
                  className="animate-fade-in"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <ShowCard 
                    show={{
                      id: show.id,
                      name: show.name,
                      date: show.date,
                      image_url: show.image_url,
                      venue: show.venue,
                      artist: { name: artistName }
                    }} 
                  />
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
      
      <Footer />
    </div>
  );
};

export default ArtistDetail;
