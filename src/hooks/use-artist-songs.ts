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
        .select('id, name, ticketmaster_id, spotify_id')
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
        
        if (!artist.ticketmaster_id || !artist.spotify_id) {
          console.error('useArtistSongs: Missing external IDs for artist sync');
          return [];
        }

        try {
          console.log(`useArtistSongs: Invoking unified-sync-v2 for artist ${artist.name}`);
          const response = await fetch('/api/unified-sync-v2', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              entityType: 'artist',
              ticketmasterId: artist.ticketmaster_id,
              spotifyId: artist.spotify_id,
              options: {
                forceRefresh: true
              }
            })
          });

          if (!response.ok) {
            const error = await response.json();
            throw new Error(`Failed to sync artist: ${error.message || 'Unknown error'}`);
          }

          // Wait a moment for the sync to complete
          await new Promise(resolve => setTimeout(resolve, 2000));

          // Refetch songs after sync
          const { data: updatedSongs, error: refetchError } = await supabase
            .from('songs')
            .select('*')
            .eq('artist_id', artistId)
            .order('popularity', { ascending: false });

          if (refetchError) throw refetchError;
          
          if (!updatedSongs || updatedSongs.length === 0) {
            console.warn('useArtistSongs: No songs found after sync');
            return [];
          }

          console.log(`useArtistSongs: Synced ${updatedSongs.length} songs for artist ${artist.name}`);
          return updatedSongs;
        } catch (error) {
          console.error('Error syncing artist:', error);
          return [];
        }
      }

      console.log(`useArtistSongs: Found ${artistSongs.length} songs for artist ${artistId}`);
      return artistSongs;
    },
    enabled: options.enabled && !!artistId,
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
    cacheTime: 30 * 60 * 1000, // Keep in cache for 30 minutes
  });

  const getAvailableSongs = useCallback((setlist: any[] = []) => {
    if (!songs) return [];
    
    // Filter out songs that are already in the setlist
    return songs.filter(song => {
      if (!song?.id) return false;
      return !setlist.some(setlistSong => setlistSong.song_id === song.id);
    });
  }, [songs]);

  return {
    songs: songs || [],
    isLoading,
    isError,
    error: artistError,
    refetch,
    getAvailableSongs,
  };
} 