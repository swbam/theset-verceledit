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

      if (data?.artist?.spotify_id) {
        setSpotifyArtistId(data.artist.spotify_id);
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
        // If not in database, trigger unified sync
        console.log("Show not found in database, triggering unified sync...");
        
        // First get the show from Ticketmaster to get artist info
        const response = await fetch(`/api/unified-sync-v2`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            entityType: 'show',
            ticketmasterId: id
          })
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(`Failed to sync show: ${error.message || 'Unknown error'}`);
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
            // If we found the show, also sync the artist's songs if needed
            if (show.artist?.spotify_id) {
              setSpotifyArtistId(show.artist.spotify_id);
              
              // Trigger artist sync to ensure we have songs
              await fetch(`/api/unified-sync-v2`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  entityType: 'artist',
                  ticketmasterId: show.artist.ticketmaster_id,
                  spotifyId: show.artist.spotify_id
                })
              });
            }
            
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
  const voteForSong = useCallback(async (songId: string) => {
    if (!songId) return false;
    try {
      const response = await fetch('/api/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ songId })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to vote');
      }

      return true;
    } catch (error) {
      console.error("Error voting for song:", error);
      return false;
    }
  }, []);

  // Add new song to setlist in database
  const addSongToSetlist = useCallback(async (song: { id: string; name: string }) => {
    if (!show?.id || !song.id) return false;
    try {
      // First get the setlist for this show
      const { data: setlist } = await supabase
        .from('setlists')
        .select('id')
        .eq('show_id', show.id)
        .single();

      if (!setlist?.id) {
        throw new Error('Setlist not found');
      }

      // Add song to setlist
      const { error: insertError } = await supabase
        .from('setlist_songs')
        .insert({
          setlist_id: setlist.id,
          song_id: song.id,
          position: 0, // Will be updated by trigger
          votes: 0
        });

      if (insertError) throw insertError;
      return true;
    } catch (error) {
      console.error("Error adding song to setlist:", error);
      return false;
    }
  }, [show?.id]);

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
