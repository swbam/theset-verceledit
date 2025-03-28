
import { useQuery } from '@tanstack/react-query';
import { useDocumentTitle } from '@/hooks/use-document-title';
import { ArtistWithEvents } from '@/lib/api/artist';
import { fetchArtistById } from '@/lib/api/artist';
import { Show } from '@/lib/api/shows';
import { fetchArtistEvents } from '@/lib/ticketmaster';
import { useEffect } from 'react';
import { saveShowToDatabase } from '@/lib/api/database-utils';

// Define the return type for the hook
interface UseArtistDetailReturn {
  artist: ArtistWithEvents | null | undefined;
  shows: Show[];
  loading: {
    artist: boolean;
    shows: boolean;
  };
  error: {
    artist: Error | null;
    shows: Error | null;
  };
}


export function useArtistDetail(id: string | undefined): UseArtistDetailReturn { // Add return type here

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
        // Removed toast.error notification
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
        // Removed toast.error notification
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
  

  // Effect to trigger server-side saving for fetched shows asynchronously
  useEffect(() => {
    if (shows && shows.length > 0) {
      console.log(`[useArtistDetail] Triggering API save for ${shows.length} shows for artist ${artist?.name}`);
      shows.forEach(show => {
        // Call the API route to handle saving with admin privileges
        fetch('/api/save-show', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(show),
        })
        .then(response => response.json())
        .then(data => {
          if (data.success) {
            // console.log(`[useArtistDetail] API save successful for show: ${show.name} (ID: ${data.showId})`);
          } else {
            console.error(`[useArtistDetail] API save failed for show ${show.id}:`, data.error);
          }
        })
        .catch(error => {
          console.error(`[useArtistDetail] API call failed for show ${show.id}:`, error);
        });
      });
    }
  }, [shows, artist?.name]); // Dependency array includes shows and artist name for logging

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
