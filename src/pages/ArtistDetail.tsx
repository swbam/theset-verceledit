
import React from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchArtistEvents } from '@/lib/ticketmaster';
import { fetchArtistById } from '@/lib/api/artist';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import ArtistHeader from '@/components/artist/ArtistHeader';
import UpcomingShows from '@/components/artist/UpcomingShows';
import ArtistDetailSkeleton from '@/components/artist/ArtistDetailSkeleton';
import ArtistNotFound from '@/components/artist/ArtistNotFound';
import PastSetlists from '@/components/artists/PastSetlists';
import { useDocumentTitle } from '@/hooks/use-document-title';

const ArtistDetail = () => {
  const { id } = useParams<{ id: string }>();
  
  // Fetch artist details with improved caching
  const {
    data: artist,
    isLoading: artistLoading,
    error: artistError
  } = useQuery({
    queryKey: ['artist', id],
    queryFn: () => fetchArtistById(id as string),
    enabled: !!id,
    staleTime: 1000 * 60 * 30, // 30 minutes
    cacheTime: 1000 * 60 * 60, // 1 hour
    retry: 1,
    refetchOnWindowFocus: false
  });
  
  // Fetch upcoming shows for this artist with improved caching
  const {
    data: shows = [],
    isLoading: showsLoading,
    error: showsError
  } = useQuery({
    queryKey: ['artistEvents', id],
    queryFn: () => fetchArtistEvents(id as string),
    enabled: !!id,
    staleTime: 1000 * 60 * 30, // 30 minutes
    cacheTime: 1000 * 60 * 60, // 1 hour
    retry: 1,
    refetchOnWindowFocus: false
  });
  
  // Set document title
  useDocumentTitle(
    artist?.name || 'Artist',
    artist?.name ? `View upcoming concerts and vote on setlists for ${artist.name}` : undefined
  );
  
  // Show skeleton immediately during initial load
  if (artistLoading && !artist) {
    return <ArtistDetailSkeleton />;
  }

  if (artistError || !id || !artist) {
    console.error("Artist detail error:", artistError);
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
          isLoading={showsLoading}
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
