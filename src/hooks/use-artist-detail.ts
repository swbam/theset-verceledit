
import { useQuery } from '@tanstack/react-query';
import { useDocumentTitle } from '@/hooks/use-document-title';
import { fetchArtistById } from '@/lib/api/artist';
import { fetchArtistEvents } from '@/lib/ticketmaster';
import { toast } from 'sonner';

export function useArtistDetail(id: string | undefined) {
  // Fetch artist details with improved error handling
  const {
    data: artist,
    isLoading: artistLoading,
    error: artistError
  } = useQuery({
    queryKey: ['artist', id],
    queryFn: async () => {
      try {
        const artistData = await fetchArtistById(id as string);
        return artistData;
      } catch (error) {
        console.error("Error fetching artist:", error);
        toast.error("Could not load artist details");
        throw error;
      }
    },
    enabled: !!id,
    staleTime: 1000 * 60 * 60, // 60 minutes
    retry: 2
  });
  
  // Fetch upcoming shows for this artist with better error handling
  const {
    data: shows = [],
    isLoading: showsLoading,
    error: showsError
  } = useQuery({
    queryKey: ['artistEvents', id],
    queryFn: async () => {
      try {
        console.log('Fetching shows for artist:', id);
        // Always fetch fresh show data from the API
        return await fetchArtistEvents(id as string);
      } catch (error) {
        console.error("Error fetching shows:", error);
        toast.error("Could not load upcoming shows");
        return [];
      }
    },
    enabled: !!id,
    staleTime: 1000 * 60 * 10, // 10 minutes - fetch more frequently
    retry: 2
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
