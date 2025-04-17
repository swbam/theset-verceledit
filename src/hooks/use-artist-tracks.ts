import { useQuery } from '@tanstack/react-query';
import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Song } from '@/lib/types';

export function useArtistTracks(
  artistId: string | undefined,
  options: { immediate?: boolean } = { immediate: true }
) {
  const {
    data,
    isLoading,
    error,
    isError,
    refetch
  } = useQuery({
    queryKey: ['artistTracks', artistId],
    queryFn: async (): Promise<{ songs: Song[] }> => {
      if (!artistId) {
        console.log("useArtistTracks: No artistId provided.");
        return { songs: [] };
      }

      console.log(`useArtistTracks: Fetching songs for artist ${artistId} from DB`);
      const { data: songs, error } = await supabase
        .from('songs')
        .select('*')
        .eq('artist_id', artistId)
        .order('popularity', { ascending: false, nullsFirst: false })
        .limit(100);

      if (error) {
        console.error(`useArtistTracks: Error fetching songs for artist ${artistId}:`, error);
        return { songs: [] };
      }

      if (!songs || songs.length === 0) {
        console.log(`useArtistTracks: No songs found in DB for artist ${artistId}. Triggering sync.`);
        
        // Get artist name for Spotify search
        const { data: artist } = await supabase
          .from('artists')
          .select('name, spotify_id')
          .eq('id', artistId)
          .single();

        if (artist?.name) {
          // Trigger song sync via Edge Function
          console.log(`useArtistTracks: Invoking sync-song for artist ${artist.name}`);
          await supabase.functions.invoke('sync-song', {
            body: { 
              artistId,
              artistName: artist.name,
              spotifyId: artist.spotify_id 
            }
          }).catch(err => {
            console.error("Failed to trigger song sync:", err);
          });
        }
        
        return { songs: [] }; // Return empty while sync runs
      }

      console.log(`useArtistTracks: Found ${songs.length} songs in DB for artist ${artistId}`);
      return { songs: songs as Song[] };
    },
    enabled: !!artistId && options.immediate !== false,
    staleTime: 1000 * 60 * 30, // 30 minutes
    gcTime: 1000 * 60 * 60,    // 1 hour
  });

  const songs = data?.songs || [];
  const initialSongs = songs.slice(0, 10);
  const storedTracksData = songs;

  const getAvailableTracks = useCallback((setlist: { id: string }[]) => {
    const setlistIds = new Set((setlist || []).map(song => song.id));
    return songs.filter((track: Song) => track.id && !setlistIds.has(track.id));
  }, [songs]);

  return {
    tracks: songs,
    initialSongs,
    storedTracksData,
    getAvailableTracks,
    isLoading,
    error,
    isError,
    refetch
  };
}
