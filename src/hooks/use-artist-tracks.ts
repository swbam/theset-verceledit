import { useQuery } from '@tanstack/react-query';
import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Song, StoredSong } from '@/lib/types';

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
      
      // Get artist with stored_songs
      const { data: artist, error: artistError } = await supabase
        .from('artists')
        .select('stored_songs, name, spotify_id')
        .eq('id', artistId)
        .single();

      if (artistError) {
        console.error(`useArtistTracks: Error fetching artist ${artistId}:`, artistError);
        return { songs: [] };
      }

      // Convert stored_songs JSONB to Song array
      const songs = (artist?.stored_songs || []).map((song: StoredSong): Song => ({
        id: song.id,
        name: song.name,
        artist_id: artistId,
        duration_ms: song.duration_ms,
        popularity: song.popularity
      }));

      if (!songs || songs.length === 0) {
        console.log(`useArtistTracks: No songs found in DB for artist ${artistId}. Triggering sync.`);
        
        if (artist?.name) {
          // Trigger unified sync via Edge Function
          console.log(`useArtistTracks: Invoking unified-sync-v2 for artist ${artist.name}`);
          await supabase.functions.invoke('unified-sync-v2', {
            body: { 
              entityType: 'artist',
              entityId: artistId,
              spotifyId: artist.spotify_id,
              options: {
                skipDependencies: false,
                forceRefresh: true
              }
            }
          }).catch(err => {
            console.error("Failed to trigger artist sync:", err);
          });
        }
        
        return { songs: [] }; // Return empty while sync runs
      }

      console.log(`useArtistTracks: Found ${songs.length} songs in DB for artist ${artistId}`);
      return { songs };
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
    return songs.filter((song: Song) => song.id && !setlistIds.has(song.id));
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
