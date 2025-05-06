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

const ANONYMOUS_VOTE_LIMIT = 3;

export function useRealtimeVotes({ showId }: UseRealtimeVotesProps) {
  const [songs, setSongs] = useState<RealtimeSong[]>([]);
  const [userVotes, setUserVotes] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [anonymousVoteCount, setAnonymousVoteCount] = useState(0);

  const supabaseClient: SupabaseClient<Database> = createClient(
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_ANON_KEY
  );

  // Fetch initial setlist songs
  useEffect(() => {
    const fetchInitialSetlist = async () => {
      setLoading(true);
      try {
        // First get the setlist ID for this show
        const { data: setlist, error: setlistError } = await supabaseClient
          .from('setlists')
          .select('id')
          .eq('show_id', showId)
          .single();

        if (setlistError) throw setlistError;

        if (setlist?.id) {
          // Then get all songs in this setlist with user votes
          const session = await supabaseClient.auth.getSession();
          const userId = session.data.session?.user?.id;

          const { data: setlistSongs, error: songsError } = await supabaseClient
            .from('setlist_songs')
            .select(`
              id,
              position,
              votes,
              songs!inner (
                id,
                name,
                spotify_id
              ),
              user_votes!left (
                user_id
              )
            `)
            .eq('setlist_id', setlist.id)
            .order('position', { ascending: true });

          if (songsError) throw songsError;

          if (setlistSongs) {
            setSongs(setlistSongs.map(song => ({
              id: song.songs.id,
              name: song.songs.name,
              spotify_id: song.songs.spotify_id,
              votes: song.votes || 0,
              order_index: song.position,
              userVoted: userId ? song.user_votes?.some(vote => vote.user_id === userId) || false : false
            })));

            // Set user votes
            if (userId) {
              const votes = setlistSongs.reduce((acc, song) => ({
                ...acc,
                [song.songs.id]: song.user_votes?.some(vote => vote.user_id === userId) || false
              }), {});
              setUserVotes(votes);
            }
          }
        }
      } catch (err) {
        console.error('Error fetching initial setlist:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch setlist');
      } finally {
        setLoading(false);
      }
    };

    fetchInitialSetlist();

    // Subscribe to realtime changes
    const channel = supabaseClient
      .channel(`setlist-${showId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'setlist_songs',
        filter: `setlist_id=eq.${showId}`
      }, async (payload: PostgresChanges) => {
        if (!payload.new || typeof payload.new !== 'object') return;
        
        const newSong = payload.new as SetlistSongRow;
        
        // Fetch the song details
        const { data: songDetails } = await supabaseClient
          .from('songs')
          .select('id, name, spotify_id')
          .eq('id', newSong.song_id)
          .single();

        if (!songDetails) return;

        setSongs((currentSongs) => {
          const songIndex = currentSongs.findIndex(s => s.id === songDetails.id);
          if (songIndex === -1) {
            return [...currentSongs, {
              id: songDetails.id,
              name: songDetails.name,
              spotify_id: songDetails.spotify_id,
              votes: newSong.votes || 0,
              order_index: newSong.position,
              userVoted: false
            }];
          }
          const newSongs = [...currentSongs];
          newSongs[songIndex] = {
            ...newSongs[songIndex],
            name: songDetails.name,
            spotify_id: songDetails.spotify_id,
            votes: newSong.votes || 0,
            order_index: newSong.position
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

  const voteForSong = useCallback(async (songId: string) => {
    if (!songId) {
      console.error('songId is required');
      return false;
    }

    try {
      const session = await supabaseClient.auth.getSession();
      const accessToken = session.data.session?.access_token;

      if (!accessToken && anonymousVoteCount >= ANONYMOUS_VOTE_LIMIT) {
        toast.error('Please sign in to continue voting!');
        return false;
      }

      const response = await fetch(`${import.meta.env.VITE_APP_URL}/api/vote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {})
        },
        body: JSON.stringify({ songId })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to vote');
      }

      // Update local state
      if (!accessToken) {
        setAnonymousVoteCount(prev => prev + 1);
      }

      setSongs(currentSongs => {
        const songIndex = currentSongs.findIndex(s => s.id === songId);
        if (songIndex === -1) return currentSongs;

        const newSongs = [...currentSongs];
        const song = newSongs[songIndex];
        newSongs[songIndex] = {
          ...song,
          votes: song.votes + 1,
          userVoted: true
        };
        return newSongs.sort((a, b) => (b.votes || 0) - (a.votes || 0));
      });

      setUserVotes(prev => ({
        ...prev,
        [songId]: true
      }));

      return true;
    } catch (err) {
      console.error('Error voting:', err);
      setError(err instanceof Error ? err.message : 'Failed to vote');
      toast.error(err instanceof Error ? err.message : 'Failed to vote. Please try again.');
      return false;
    }
  }, [supabaseClient, anonymousVoteCount]);

  const addSongToSetlist = useCallback(async (song: RealtimeSong) => {
    try {
      const { data: setlist } = await supabaseClient
        .from('setlists')
        .select('id')
        .eq('show_id', showId)
        .single();

      if (!setlist?.id) {
        throw new Error('Setlist not found');
      }

      const { error: insertError } = await supabaseClient
        .from('setlist_songs')
        .insert({
          setlist_id: setlist.id,
          song_id: song.id,
          position: songs.length + 1,
          votes: 0
        });

      if (insertError) throw insertError;

      return true;
    } catch (err) {
      console.error('Error adding song to setlist:', err);
      toast.error('Failed to add song to setlist');
      return false;
    }
  }, [showId, songs.length, supabaseClient]);

  return {
    songs,
    userVotes,
    loading,
    error,
    voteForSong,
    addSongToSetlist,
    isConnected,
    anonymousVoteCount
  };
}
