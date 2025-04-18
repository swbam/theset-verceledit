import { useQuery } from '@tanstack/react-query';
import { useCallback, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';
import { v4 as uuidv4 } from 'uuid';

export function useShowDetails(id: string | undefined) {
  const [spotifyArtistId, setSpotifyArtistId] = useState<string>('');

  type ShowWithRelations = Database['public']['Tables']['shows']['Row'] & {
    artist: Database['public']['Tables']['artists']['Row'] | null;
    venue: Database['public']['Tables']['venues']['Row'] | null;
  };

  // Memoize the checkShowInDatabase function to prevent recreating it on each render
  const checkShowInDatabase = useCallback(async (showId: string): Promise<ShowWithRelations | null> => {
    try {
      const { data, error } = await supabase
        .from('shows')
        .select(`
          *,
          artist:artists(*),
          venue:venues(*)
        `)
        .or(`id.eq.${showId},ticketmaster_id.eq.${showId}`)
        .maybeSingle();

      if (error) {
        console.log("Database check error:", error.message);
        return null;
      }

      return data;
    } catch (err) {
      console.error("Error checking show in database:", err);
      return null;
    }
  }, []);

  const { 
    data: show, 
    isLoading: isLoadingShow,
    error: showError,
    isError
  } = useQuery({
    queryKey: ['show', id],
    queryFn: async () => {
      if (!id) throw new Error("Show ID is required");

      // First try to get show from database
      const dbShow = await checkShowInDatabase(id);
      
      if (!dbShow) {
        // If not in database, trigger sync and wait for it
        console.log("Show not found in database, triggering sync...");
        const { error: syncError } = await supabase.functions.invoke('sync-show', {
          body: { showId: id }
        });

        if (syncError) {
          console.error("Error syncing show:", syncError);
          throw new Error("Failed to sync show data");
        }

        // Wait for sync to complete with retries
        let retries = 0;
        const maxRetries = 5;
        let syncedShow = null;

        while (retries < maxRetries) {
          const { data: show, error } = await supabase
            .from('shows')
            .select(`
              *,
              artist:artists(*),
              venue:venues(*)
            `)
            .or(`id.eq.${id},ticketmaster_id.eq.${id}`)
            .maybeSingle();

          if (error) {
            console.error("Error fetching synced show:", error);
          }

          if (show) {
            syncedShow = show;
            break;
          }

          retries++;
          if (retries < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, 2000 * retries)); // Exponential backoff
          }
        }

        if (!syncedShow) {
          throw new Error("Failed to find synced show after multiple retries");
        }

        return syncedShow;
      }

      return dbShow;
    },
    staleTime: 1000 * 60 * 5, // Consider data fresh for 5 minutes
    retry: 3
  });

  // vote for a song in the database
  const voteForSong = useCallback(async (songId: string, showId: string) => {
    if (!songId || !showId) return false;
    try {
      const { error } = await supabase.rpc('add_vote', {
        p_song_id: songId,
        p_show_id: showId,
      });
      if (error) {
        console.error("Error voting for song:", error);
        return false;
      }
      console.log(`Vote recorded for song ${songId}`);
      return true;
    } catch (error) {
      console.error("Error voting for song:", error);
      return false;
    }
  }, []);

  // Add new song to setlist in database
  // Define a basic type for the song object expected here
  type SongInput = { id: string; position: number; info?: string | null; is_encore?: boolean };

  const addSongToSetlist = useCallback(async (setlistId: string, song: SongInput) => {
    if (!setlistId || !song) return false;
    try {
      const { error } = await supabase
        .from('played_setlist_songs')
        .insert({
          id: uuidv4(),
          setlist_id: setlistId,
          song_id: song.id,
          position: song.position,
          info: song.info ?? null,
          is_encore: song.is_encore ?? false,
        });
      if (error) {
        console.error("Error adding song to setlist:", error);
        return false;
      }
      return true;
    } catch (error) {
      console.error("Error adding song to setlist:", error);
      return false;
    }
  }, []);

  return {
    show,
    isLoadingShow,
    showError,
    isError,
    spotifyArtistId,
    voteForSong,
    addSongToSetlist
  };
}
