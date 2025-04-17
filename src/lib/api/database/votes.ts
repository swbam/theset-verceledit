import { supabase } from "@/integrations/supabase/client";

/**
 * Add a vote to a song within the context of a specific show.
 * Uses IP/session fingerprinting within the RPC function for uniqueness per show.
 */
export async function addVoteToSong(songId: string, showId: string) { // Needs showId for the RPC
  try {
    // The RPC function 'add_vote' handles uniqueness checks internally.
    
    // Call the 'add_vote' RPC function with correct parameters
    const { data: rpcSuccess, error } = await supabase.rpc('add_vote', {
      p_song_id: songId,
      p_show_id: showId // Pass showId to the RPC
    });
    
    if (error) {
      console.error("Error adding vote:", error);
      throw new Error(`Failed to add vote: ${error.message}`);
    }
    
    console.log(`Vote RPC 'add_vote' called for song ${songId} in show ${showId}. Success: ${rpcSuccess}`);
    
    if (!rpcSuccess) {
      // The RPC returned false, likely meaning the user already voted (based on session/IP)
      return { success: false, message: "Already voted in this session." };
    }
    
    // Fetch the updated vote_count directly from the songs table, as the RPC updates it.
    const { data: updatedSong, error: songFetchError } = await supabase
      .from('songs')
      .select('vote_count')
      .eq('id', songId)
      .single();

    if (songFetchError) {
       console.error("Error fetching updated vote count from songs table:", songFetchError);
       return { success: true, message: "Vote recorded, but failed to fetch updated count", votes: null };
    }

    return {
      success: true,
      message: "Vote recorded successfully",
      votes: updatedSong?.vote_count ?? 0, // Return the new count from the songs table
    };
  } catch (error) {
    console.error("Error in addVoteToSong:", error);
    throw error;
  }
}

/**
 * Get all songs for a setlist with vote counts and user's voting status
 */
export async function getSetlistWithVotes(setlistId: string, userId?: string) {
  try {
    // Get all played songs linked to the setlist
    const { data: playedSongs, error: songsError } = await supabase
      .from('played_setlist_songs') // Use the correct table linking songs to setlists
      .select(`
        *,
        song:songs(*)
      `)
      .eq('setlist_id', setlistId)
      .order('position', { ascending: true }); // Order by position in setlist
    
    if (songsError) {
      console.error("Error fetching played setlist songs:", songsError);
      throw new Error(`Failed to fetch played setlist songs: ${songsError.message}`);
    }

    if (!playedSongs || playedSongs.length === 0) {
      return []; // No songs found for this setlist
    }

    // Extract song IDs to check votes
    const songIds = playedSongs.map(ps => ps.song_id).filter((id): id is string => !!id);

    // If no user ID, return songs with vote counts fetched directly from the joined songs table
    const songDetails = playedSongs.map(ps => ({
      ...(ps.song ?? {}),
      id: ps.song?.id ?? `unknown-${ps.id}`,
      name: ps.song?.name ?? 'Unknown Song',
      played_song_id: ps.id,
      position: ps.position,
      is_encore: ps.is_encore,
      info: ps.info,
      vote_count: typeof ps.song?.vote_count === 'number' ? ps.song.vote_count : 0,
      hasVoted: false
    }));

    if (!userId) {
      return songDetails; // Return details with vote counts, hasVoted is false
    }

    // Get all votes by this user for the songs in this setlist
    const { data: userVotesData, error: votesError } = await supabase
      .from('votes')
      .select('song_id')
      .eq('user_id', userId) // Filter by the specific user
      .in('song_id', songIds); // Only for songs in this setlist

    if (votesError) {
      console.error("Error fetching user votes:", votesError);
      // Return songs with vote counts but hasVoted as false
      return songDetails;
    }

    // Create a set of song IDs the user has voted for
    const votedSongIds = new Set(userVotesData.map(vote => vote.song_id));

    // Update the hasVoted flag for the songs the user has voted for
    return songDetails.map(song => ({
      ...song,
      hasVoted: votedSongIds.has(song.id)
    }));
  } catch (error) {
    console.error("Error in getSetlistWithVotes:", error);
    throw error;
  }
}

/**
 * Setup Supabase stored procedure for atomic vote operations (If needed)
 * This function seems obsolete as 'create_vote_procedures' RPC doesn't exist.
 */
export async function setupVotingProcedures() {
  // This function is likely no longer needed as the required RPC doesn't exist.
  // Keeping the structure but commenting out the call.
  console.warn("setupVotingProcedures is likely obsolete. The 'create_vote_procedures' RPC was not found.");
  return true; // Indicate successful (non-)operation
}
