
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
  
  // Process artist data from the ID
  const artistName = id?.startsWith('tm-') 
    ? id.replace('tm-', '').replace(/-/g, ' ') 
    : id || '';
  
  const {
    data: shows = [],
    isLoading,
    error
  } = useQuery({
    queryKey: ['artistEvents', id],
    queryFn: () => fetchArtistEvents(artistName),
    enabled: !!id,
    staleTime: 1000 * 60 * 10, // 10 minutes
  });
  
  // Get artist image from the first show if available
  const artistImage = shows.length > 0 ? shows[0].image_url : undefined;
  const upcomingShowsCount = shows.length;

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
          upcomingShowsCount={upcomingShowsCount}
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
