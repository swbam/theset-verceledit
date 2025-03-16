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
import { toast } from 'sonner';

const ArtistDetail = () => {
  const { id } = useParams<{ id: string }>();
  
  // Process artist data from the ID
  const processArtistId = (artistId?: string) => {
    if (!artistId) return { name: '', searchTerm: '' };
    
    // Handle Ticketmaster IDs
    if (artistId.startsWith('tm-')) {
      const name = artistId.replace('tm-', '').replace(/-/g, ' ');
      return { 
        name: name.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
        searchTerm: name
      };
    }
    
    // Handle regular Ticketmaster IDs (K8vZ...)
    if (artistId.startsWith('K')) {
      // We'll need to extract the name from the first show
      return { name: '', searchTerm: artistId };
    }
    
    // Default fallback
    return { 
      name: artistId.replace(/-/g, ' '), 
      searchTerm: artistId
    };
  };
  
  const { name: artistName, searchTerm } = processArtistId(id);
  
  const {
    data: shows = [],
    isLoading,
    error
  } = useQuery({
    queryKey: ['artistEvents', id],
    queryFn: async () => {
      try {
        // For Ticketmaster IDs that don't start with 'tm-', we need to use ID directly
        if (id && id.startsWith('K')) {
          return fetchArtistEvents(id);
        }
        // Otherwise use the search term derived from the ID
        return fetchArtistEvents(searchTerm);
      } catch (error) {
        console.error("Error fetching artist events:", error);
        toast.error("Failed to load upcoming shows");
        return [];
      }
    },
    enabled: !!id,
    staleTime: 1000 * 60 * 10, // 10 minutes
  });
  
  // Get artist image from the first show if available and update artist name if empty
  const artistImage = shows.length > 0 ? shows[0].image_url : undefined;
  // If artistName is empty, try to get it from the first show
  const finalArtistName = artistName || (shows.length > 0 && shows[0].artist?.name) || 'Artist';
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
          artistName={finalArtistName} 
          artistImage={artistImage}
          upcomingShowsCount={upcomingShowsCount}
        />
        
        <UpcomingShows 
          shows={shows}
          artistName={finalArtistName}
        />
        
        <PastSetlists 
          artistId={id}
          artistName={finalArtistName}
        />
      </main>
      
      <Footer />
    </div>
  );
};

export default ArtistDetail;
