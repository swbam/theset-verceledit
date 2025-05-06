import { useQuery } from '@tanstack/react-query';
import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Song } from '@/lib/types';

export function useArtistSongs(
  artistId: string | undefined,
  options = {
    enabled: true,
  }
) {
  const { data: songs, error: artistError, isLoading, isError, refetch } = useQuery({
    queryKey: ['artistSongs', artistId],
    queryFn: async () => {
      if (!artistId) {
        console.log("useArtistSongs: No artistId provided.");
        return [];
      }

      console.log(`useArtistSongs: Fetching songs for artist ${artistId} from DB`);
      
      // First try to get the artist from our database
      const { data: artist, error: artistError } = await supabase
        .from('artists')
        .select('*')
        .eq('id', artistId)
        .single();

      if (artistError) {
        console.error(`useArtistSongs: Error fetching artist ${artistId}:`, artistError);
        throw artistError;
      }

      if (!artist) {
        throw new Error(`Artist ${artistId} not found`);
      }

      // Get songs from the songs table
      const { data: artistSongs, error: songsError } = await supabase
        .from('songs')
        .select('*')
        .eq('artist_id', artistId)
        .order('popularity', { ascending: false });

      if (songsError) {
        console.error(`useArtistSongs: Error fetching songs for artist ${artistId}:`, songsError);
        throw songsError;
      }

      if (!artistSongs || artistSongs.length === 0) {
        console.log(`useArtistSongs: No songs found in DB for artist ${artistId}. Triggering sync.`);
        
        try {
          console.log(`useArtistSongs: Invoking unified-sync-v2 for artist ${artist.name}`);
          const response = await fetch('/api/unified-sync-v2', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              type: 'artist',
              artistId: artist.id,
              forceRefresh: true
            })
          });

          if (!response.ok) {
            throw new Error('Failed to sync artist');
          }

          // Refetch songs after sync
          const { data: updatedSongs, error: refetchError } = await supabase
            .from('songs')
            .select('*')
            .eq('artist_id', artistId)
            .order('popularity', { ascending: false });

          if (refetchError) throw refetchError;
          return updatedSongs || [];
        } catch (error) {
          console.error('Error syncing artist:', error);
          return [];
        }
      }

      console.log(`useArtistSongs: Found ${artistSongs.length} songs for artist ${artistId}`);
      return artistSongs;
    },
    enabled: options.enabled && !!artistId,
  });

  const getAvailableSongs = useCallback(() => {
    return songs || [];
  }, [songs]);

  return {
    songs,
    isLoading,
    isError,
    error: artistError,
    refetch,
    getAvailableSongs,
  };
} 