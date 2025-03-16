
import React from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchArtistEvents } from '@/lib/ticketmaster';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import ArtistHeader from '@/components/artist/ArtistHeader';
import UpcomingShows from '@/components/artist/UpcomingShows';
import ArtistDetailSkeleton from '@/components/artist/ArtistDetailSkeleton';
import ArtistNotFound from '@/components/artist/ArtistNotFound';
import PastSetlists from '@/components/artists/PastSetlists';

const ArtistDetail = () => {
  const { id } = useParams<{ id: string }>();
  
  const {
    data: shows = [],
    isLoading,
    error
  } = useQuery({
    queryKey: ['artistEvents', id],
    queryFn: () => {
      // Since we're getting the artists from Ticketmaster, we need to extract the name
      // This is a simplification - in a real app we'd have a proper lookup
      const artistName = id?.startsWith('tm-') 
        ? id.replace('tm-', '').replace(/-/g, ' ') 
        : id;
      
      return fetchArtistEvents(artistName || '');
    },
    enabled: !!id,
  });
  
  // Process artist data
  const artistName = id?.startsWith('tm-') 
    ? id.replace('tm-', '').replace(/-/g, ' ') 
    : id || '';
  
  // Get artist image from the first show if available
  const artistImage = shows.length > 0 ? shows[0].image_url : undefined;

  if (isLoading) {
    return <ArtistDetailSkeleton />;
  }

  if (error || !id) {
    return <ArtistNotFound />;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <main className="flex-grow">
        <ArtistHeader 
          artistName={artistName} 
          artistImage={artistImage}
          upcomingShowsCount={shows.length}
        />
        
        <UpcomingShows 
          shows={shows}
          artistName={artistName}
        />
        
        <PastSetlists 
          artistId={id}
          artistName={artistName}
        />
      </main>
      
      <Footer />
    </div>
  );
};

export default ArtistDetail;
