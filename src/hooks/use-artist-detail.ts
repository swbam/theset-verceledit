import { useQuery } from '@tanstack/react-query';
import { useDocumentTitle } from '@/hooks/use-document-title';
import { fetchArtistById } from '@/lib/api/artist';
import { fetchArtistEvents } from '@/lib/ticketmaster';

export function useArtistDetail(id: string | undefined) {
  // Fetch artist details with improved caching and optimizations
  const {
    data: artist,
    isLoading: artistLoading,
    error: artistError
  } = useQuery({
    queryKey: ['artist', id],
    queryFn: () => fetchArtistById(id as string),
    enabled: !!id,
    staleTime: 1000 * 60 * 60, // 60 minutes
    gcTime: 1000 * 60 * 120, // 2 hours
    retry: 1,
    refetchOnWindowFocus: false
  });
  
  // Fetch upcoming shows for this artist with optimized caching
  const {
    data: shows = [],
    isLoading: showsLoading,
    error: showsError
  } = useQuery({
    queryKey: ['artistEvents', id],
    queryFn: async () => {
      console.log('Fetching shows for artist:', id);
      // First check if the artist already has shows in memory
      if (artist && artist.stored_shows && artist.stored_shows.length > 0) {
        console.log('Using cached shows from artist object', artist.stored_shows.length);
        return artist.stored_shows;
      }
      
      // Otherwise fetch from API
      const fetchedShows = await fetchArtistEvents(id as string);
      console.log('Fetched shows from API:', fetchedShows?.length);
      return fetchedShows;
    },
    enabled: !!id,
    staleTime: 1000 * 60 * 30, // 30 minutes (reduced from 60)
    gcTime: 1000 * 60 * 60, // 1 hour (reduced from 2)
    retry: 1,
    refetchOnWindowFocus: false
  });
  
  // Set document title
  useDocumentTitle(
    artist?.name || 'Artist',
    artist?.name ? `View upcoming concerts and vote on setlists for ${artist.name}` : undefined
  );
  
  return {
    artist,
    shows,
    loading: {
      artist: artistLoading,
      shows: showsLoading
    },
    error: {
      artist: artistError,
      shows: showsError
    }
  };
}
