import { useEffect, useState, useCallback } from 'react';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { toast } from "sonner";
import { Database } from '@/types/supabase';

interface RealtimeSong {
  id: string;
  name: string;
  spotify_id?: string | null;
  votes: number;
  order_index?: number | null;
  userVoted: boolean;
}

interface UseRealtimeVotesProps {
  showId: string;
}

type SetlistSongRow = Database['public']['Tables']['setlist_songs']['Row'];
type PostgresChanges = RealtimePostgresChangesPayload<SetlistSongRow>;

export function useRealtimeVotes({ showId }: UseRealtimeVotesProps) {
  const [songs, setSongs] = useState<RealtimeSong[]>([]);
  const [userVotes, setUserVotes] = useState<Record<string, 'upvote' | 'downvote'>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const supabaseClient: SupabaseClient<Database> = createClient(
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_ANON_KEY
  );

  // Subscribe to realtime changes
  useEffect(() => {
    setLoading(true);
    const channel = supabaseClient
      .channel(`setlist-${showId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'setlist_songs',
        filter: `setlist_id=eq.${showId}`
      }, (payload: PostgresChanges) => {
        if (!payload.new || typeof payload.new !== 'object') return;
        
        const newSong = payload.new as SetlistSongRow;
        setSongs((currentSongs) => {
          const songIndex = currentSongs.findIndex(s => s.id === newSong.id);
          if (songIndex === -1) {
            return [...currentSongs, {
              id: newSong.id,
              name: newSong.name || '',
              spotify_id: newSong.spotify_id,
              votes: newSong.votes || 0,
              order_index: newSong.order_index,
              userVoted: false
            }];
          }
          const newSongs = [...currentSongs];
          newSongs[songIndex] = {
            ...newSongs[songIndex],
            name: newSong.name || '',
            spotify_id: newSong.spotify_id,
            votes: newSong.votes || 0,
            order_index: newSong.order_index,
            userVoted: newSongs[songIndex].userVoted
          };
          return newSongs.sort((a, b) => (b.votes || 0) - (a.votes || 0));
        });
      })
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED');
        setLoading(false);
      });

    return () => {
      channel.unsubscribe();
    };
  }, [showId, supabaseClient]);

  const vote = useCallback(async (songId: string, action: 'upvote' | 'downvote') => {
    if (!songId) {
      console.error('songId is required');
      return;
    }

    try {
      const session = await supabaseClient.auth.getSession();
      const accessToken = session.data.session?.access_token;

      const response = await fetch(`${import.meta.env.VITE_APP_URL}/functions/v1/vote-song`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {})
        },
        body: JSON.stringify({
          songId,
          action
        })
      });

      if (!response.ok) {
        throw new Error('Failed to vote');
      }

      // Update local state
      setSongs(currentSongs => {
        const songIndex = currentSongs.findIndex(s => s.id === songId);
        if (songIndex === -1) return currentSongs;

        const newSongs = [...currentSongs];
        const song = newSongs[songIndex];
        newSongs[songIndex] = {
          ...song,
          votes: song.votes + (action === 'upvote' ? 1 : -1),
          userVoted: true
        };
        return newSongs.sort((a, b) => (b.votes || 0) - (a.votes || 0));
      });

      setUserVotes(prev => ({
        ...prev,
        [songId]: action
      }));

    } catch (err) {
      console.error('Error voting:', err);
      setError(err instanceof Error ? err.message : 'Failed to vote');
      toast.error('Failed to vote. Please try again.');
    }
  }, [supabaseClient]);

  return {
    songs,
    userVotes,
    loading,
    error,
    vote,
    isConnected
  };
}
