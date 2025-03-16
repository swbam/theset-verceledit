
import React from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchArtistEvents, fetchArtistById } from '@/lib/ticketmaster';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import ArtistHeader from '@/components/artist/ArtistHeader';
import UpcomingShows from '@/components/artist/UpcomingShows';
import ArtistDetailSkeleton from '@/components/artist/ArtistDetailSkeleton';
import ArtistNotFound from '@/components/artist/ArtistNotFound';
import PastSetlists from '@/components/artists/PastSetlists';
import { toast } from 'sonner';

const ArtistDetail = () => {
  const { id } = useParams<{ id: string }>();
  
  // Fetch artist details
  const {
    data: artist,
    isLoading: artistLoading,
    error: artistError
  } = useQuery({
    queryKey: ['artist', id],
    queryFn: () => fetchArtistById(id as string),
    enabled: !!id,
    staleTime: 1000 * 60 * 10, // 10 minutes
  });
  
  // Fetch upcoming shows for this artist
  const {
    data: shows = [],
    isLoading: showsLoading,
    error: showsError
  } = useQuery({
    queryKey: ['artistEvents', id],
    queryFn: () => fetchArtistEvents(id as string),
    enabled: !!id,
    staleTime: 1000 * 60 * 10, // 10 minutes
  });
  
  const isLoading = artistLoading || showsLoading;
  const error = artistError || showsError;
  
  if (isLoading) {
    return <ArtistDetailSkeleton />;
  }

  if (error || !id || !artist) {
    return <ArtistNotFound />;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <main className="flex-grow">
        <ArtistHeader 
          artistName={artist.name} 
          artistImage={artist.image}
          upcomingShowsCount={shows.length}
        />
        
        <UpcomingShows 
          shows={shows}
          artistName={artist.name}
        />
        
        <PastSetlists 
          artistId={id}
          artistName={artist.name}
        />
      </main>
      
      <Footer />
    </div>
  );
};

export default ArtistDetail;
