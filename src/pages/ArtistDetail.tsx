
import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchArtistEvents } from '@/lib/ticketmaster';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import ArtistHeader from '@/components/artist/ArtistHeader';
import UpcomingShows from '@/components/artist/UpcomingShows';
import ArtistDetailSkeleton from '@/components/artist/ArtistDetailSkeleton';
import ArtistNotFound from '@/components/artist/ArtistNotFound';

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
  
  if (isLoadingEvents) {
    return <ArtistDetailSkeleton />;
  }
  
  if (eventsError || events.length === 0) {
    return <ArtistNotFound />;
  }
  
  // Extract artist image from the first event
  const artistImage = firstEvent?.image_url;
  
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <main className="flex-grow">
        <ArtistHeader 
          artistName={artistName}
          artistImage={artistImage}
          upcomingShowsCount={events.length}
        />
        
        <UpcomingShows 
          shows={events}
          artistName={artistName}
        />
      </main>
      
      <Footer />
    </div>
  );
};

export default ArtistDetail;
