import { useQuery } from '@tanstack/react-query';
import { useDocumentTitle } from '@/hooks/use-document-title';
import { ArtistWithEvents } from '@/lib/api/artist';
import { fetchArtistById } from '@/lib/api/artist';
import { Show } from '@/lib/types';
import { fetchArtistEvents } from '@/lib/ticketmaster';
import { useEffect } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

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

export function useArtistDetail(id: string | undefined): UseArtistDetailReturn {
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
        throw error;
      }
    },
    enabled: !!id,
    staleTime: 1000 * 60 * 60, // 60 minutes
    retry: 2
  });
  
  const {
    data: shows = [],
    isLoading: showsLoading,
    error: showsError
  } = useQuery<Show[]>({
    queryKey: ['artistEvents', id],
    queryFn: async () => {
      try {
        console.log('Fetching shows for artist:', id);
        return await fetchArtistEvents(id as string);
      } catch (error) {
        console.error("Error fetching shows:", error);
        return [];
      }
    },
    enabled: !!id,
    staleTime: 1000 * 60 * 10, // 10 minutes
    retry: 2
  });
  
  useDocumentTitle(
    artist?.name || 'Artist',
    artist?.name ? `View upcoming concerts and vote on setlists for ${artist.name}` : undefined
  );
  
  // Effect to sync artist and shows data
  useEffect(() => {
    if (artist && artist.id) {
      console.log(`[useArtistDetail] Artist loaded, syncing: ${artist.name} (${artist.id})`);
      
      supabase.functions.invoke('unified-sync', {
        body: {
          entityType: 'artist',
          ticketmasterId: artist.id,
          options: {
            skipDependencies: false,
            forceRefresh: true
          }
        }
      }).then(({ data, error }) => {
        if (error) {
          console.error(`[useArtistDetail] Error syncing artist ${artist.name}:`, error);
        } else if (!data?.success) {
          console.warn(`[useArtistDetail] Artist sync failed for ${artist.name}:`, data?.error || data?.message);
        } else {
          console.log(`[useArtistDetail] Successfully synced artist ${artist.name}`);
        }
      }).catch(invokeError => {
        console.error(`[useArtistDetail] Network error syncing artist ${artist.name}:`, invokeError);
      });
    }
  }, [artist]);

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
