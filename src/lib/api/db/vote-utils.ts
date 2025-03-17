
import { supabase } from "@/integrations/supabase/client";

/**
 * Vote for a song in a setlist
 */
export async function voteForSong(setlistSongId: string, userId: string) {
  try {
    if (!setlistSongId || !userId) return false;
    
    // Check if user already voted
    const { data: existingVote, error: checkError } = await supabase
      .from('votes')
      .select('id')
      .eq('setlist_song_id', setlistSongId)
      .eq('user_id', userId)
      .maybeSingle();
      
    if (checkError) {
      console.error("Error checking existing vote:", checkError);
    }
    
    if (existingVote) {
      console.log("User already voted for this song");
      return true; // Already voted
    }
    
    // Add vote
    const { error: voteError } = await supabase
      .from('votes')
      .insert({
        setlist_song_id: setlistSongId,
        user_id: userId,
        created_at: new Date().toISOString()
      });
    
    if (voteError) {
      // If duplicate vote, ignore
      if (voteError.code === '23505') { // Unique constraint violation
        console.log("User already voted for this song");
        return true;
      }
      
      console.error("Error voting for song:", voteError);
      return false;
    }
    
    // Increment vote count via edge function (prevents race conditions)
    const { error: incrementError } = await supabase.functions.invoke(
      'increment_song_votes', 
      { body: { song_id: setlistSongId, user_id: userId } }
    );
    
    if (incrementError) {
      console.error("Error incrementing vote count:", incrementError);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error("Error in voteForSong:", error);
    return false;
  }
}

/**
 * Check if user has voted for a song
 */
export async function hasUserVotedForSong(setlistSongId: string, userId: string) {
  try {
    if (!setlistSongId || !userId) return false;
    
    const { data, error } = await supabase
      .from('votes')
      .select('id')
      .eq('setlist_song_id', setlistSongId)
      .eq('user_id', userId)
      .maybeSingle();
    
    if (error) {
      console.error("Error checking if user voted:", error);
      return false;
    }
    
    return !!data;
  } catch (error) {
    console.error("Error in hasUserVotedForSong:", error);
    return false;
  }
}
