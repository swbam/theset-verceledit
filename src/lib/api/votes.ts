import { supabase } from '../supabase';
import { toast } from 'sonner';

/**
 * Vote for a song in a setlist
 * @param songId The ID of the setlist song to vote for
 * @param userId The ID of the user voting
 * @returns A boolean indicating success/failure
 */
export const voteForSong = async (songId: string, userId: string): Promise<boolean> => {
  try {
    // Check if the user has already voted for this song
    const { data: existingVote, error: checkError } = await supabase
      .from('votes')
      .select('id')
      .eq('setlist_song_id', songId)
      .eq('user_id', userId)
      .single();
    
    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 means no rows returned, which is what we want
      console.error('Error checking for existing vote:', checkError);
      throw new Error('Failed to verify your vote status');
    }
    
    // If user already voted, don't allow another vote
    if (existingVote) {
      return true; // Successful in the sense that the user's vote is already recorded
    }
    
    // Insert the new vote
    const { data, error } = await supabase
      .from('votes')
      .insert({
        setlist_song_id: songId,
        user_id: userId
      })
      .select('id');
    
    if (error) {
      console.error('Error voting for song:', error);
      
      if (error.code === '23505') { // Unique constraint violation
        toast.info("You've already voted for this song");
        return true;
      }
      
      throw new Error(`Failed to record your vote: ${error.message}`);
    }
    
    return !!data;
  } catch (error) {
    console.error('Error in voteForSong:', error);
    throw error;
  }
};

/**
 * Get all songs that a user has voted for
 * @param userId The ID of the user
 * @param setlistId Optional setlist ID to filter by
 * @returns An array of song IDs the user has voted for
 */
export const getUserVotes = async (userId: string, setlistId?: string): Promise<string[]> => {
  try {
    let query = supabase
      .from('votes')
      .select('setlist_song_id')
      .eq('user_id', userId);
    
    if (setlistId) {
      // Join to filter by setlist ID
      query = query.eq('setlist_songs.setlist_id', setlistId);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Error getting user votes:', error);
      throw new Error(`Failed to get your votes: ${error.message}`);
    }
    
    return data ? data.map(vote => vote.setlist_song_id) : [];
  } catch (error) {
    console.error('Error in getUserVotes:', error);
    throw error;
  }
}; 