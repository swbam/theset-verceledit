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
  
  // Effect to sync artist data
  useEffect(() => {
    if (artist && artist.id) {
      console.log(`[useArtistDetail] Artist loaded, syncing: ${artist.name} (${artist.id})`);
      
      supabase.functions.invoke('sync-artist', {
        body: { artistId: artist.id }
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

  // Effect to sync shows and venues
  useEffect(() => {
    if (shows && shows.length > 0) {
      console.log(`[useArtistDetail] Syncing ${shows.length} shows for artist ${artist?.name}`);
      
      shows.forEach(show => {
        const showId = show.ticketmaster_id || show.external_id || show.id;
        const venueId = show.venue_external_id;
        
        if (!showId) {
          console.warn(`[useArtistDetail] Skipping show sync - no ID: ${show.name}`);
          return;
        }

        // 1. Sync venue first if available
        if (venueId) {
          console.log(`[useArtistDetail] Syncing venue for show ${show.name}`);
          supabase.functions.invoke('sync-venue', {
            body: { venueId }
          }).catch(error => {
            console.error(`[useArtistDetail] Venue sync failed for ${venueId}:`, error);
          });
        }

        // 2. Then sync show
        console.log(`[useArtistDetail] Syncing show ${show.name}`);
        supabase.functions.invoke('sync-show', {
          body: { showId }
        }).then(({ data, error }) => {
          if (error) {
            console.error(`[useArtistDetail] Show sync failed for ${show.name}:`, error);
          } else if (!data?.success) {
            console.warn(`[useArtistDetail] Show sync failed for ${show.name}:`, data?.error || data?.message);
          } else {
            console.log(`[useArtistDetail] Successfully synced show ${show.name}`);
          }
        }).catch(error => {
          console.error(`[useArtistDetail] Network error syncing show ${show.name}:`, error);
        });
      });
    }
  }, [shows, artist?.name]);

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
