import { supabase } from './supabase';
import { toast } from 'sonner';

/**
 * Sets up a real-time subscription for setlist vote changes
 * @param setlistId The ID of the setlist to watch
 * @param onVoteUpdate Callback function that fires when votes are updated
 * @returns A function to unsubscribe from the real-time updates
 */
export const subscribeToSetlistVotes = (
  setlistId: string,
  onVoteUpdate: (payload: any) => void
) => {
  try {
    // Subscribe to changes on the votes table for this setlist
    const subscription = supabase
      .channel(`setlist-votes-${setlistId}`)
      .on(
        'postgres_changes',
        {
          event: '*', // Listen for inserts, updates, and deletes
          schema: 'public',
          table: 'votes',
          filter: `setlist_id=eq.${setlistId}`
        },
        (payload) => {
          console.log('Received vote update:', payload);
          onVoteUpdate(payload);
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log(`Subscribed to votes for setlist ${setlistId}`);
        } else if (status === 'CHANNEL_ERROR') {
          console.error(`Error subscribing to votes for setlist ${setlistId}`);
          toast.error("Lost connection to live updates. Votes may not be current.", {
            id: "realtime-connection-error",
            duration: 5000
          });
        }
      });

    // Return unsubscribe function
    return () => {
      console.log(`Unsubscribing from votes for setlist ${setlistId}`);
      subscription.unsubscribe();
    };
  } catch (error) {
    console.error('Error setting up real-time subscription:', error);
    toast.error("Could not establish connection for live vote updates");
    // Return a no-op function in case of error
    return () => {};
  }
};

/**
 * Sets up a real-time subscription for song votes in a setlist
 * @param setlistSongId The ID of the setlist song to watch
 * @param onVoteUpdate Callback function that fires when votes are updated
 * @returns A function to unsubscribe from the real-time updates
 */
export const subscribeToSongVotes = (
  setlistSongId: string,
  onVoteUpdate: (newCount: number) => void
) => {
  try {
    // Subscribe to changes on the votes table for this specific song
    const subscription = supabase
      .channel(`song-votes-${setlistSongId}`)
      .on(
        'postgres_changes',
        {
          event: '*', // Listen for inserts, updates, and deletes
          schema: 'public',
          table: 'votes',
          filter: `setlist_song_id=eq.${setlistSongId}`
        },
        async (payload) => {
          console.log('Received song vote update:', payload);
          
          // Get the new vote count for this song
          const { data, error } = await supabase
            .from('votes')
            .select('id')
            .eq('setlist_song_id', setlistSongId);
            
          if (!error && data) {
            // Call the callback with the new vote count
            onVoteUpdate(data.length);
          }
        }
      )
      .subscribe();

    // Return unsubscribe function
    return () => {
      subscription.unsubscribe();
    };
  } catch (error) {
    console.error('Error setting up song vote subscription:', error);
    return () => {};
  }
}; 