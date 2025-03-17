
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * Add a song to a setlist
 */
export async function addSongToSetlist(setlistId: string, trackId: string) {
  try {
    console.log(`Adding song ${trackId} to setlist ${setlistId}`);
    
    // First, make sure the track exists in the top_tracks table
    const { data: trackData, error: trackError } = await supabase
      .from('top_tracks')
      .select('*')
      .eq('id', trackId)
      .maybeSingle();
    
    if (trackError) {
      console.error("Error checking track existence:", trackError);
      return null;
    }
    
    if (!trackData) {
      console.warn(`Track ${trackId} not found in top_tracks table, may be a placeholder`);
      // We'll continue anyway since the track ID might be valid from Spotify directly
    }
    
    // Insert the song into the setlist_songs table
    const { data, error } = await supabase
      .from('setlist_songs')
      .insert({
        setlist_id: setlistId,
        track_id: trackId,
        votes: 0
      })
      .select('id')
      .single();
    
    if (error) {
      console.error("Error adding song to setlist:", error);
      return null;
    }
    
    // Update the last_updated timestamp on the setlist
    const { error: updateError } = await supabase
      .from('setlists')
      .update({ last_updated: new Date().toISOString() })
      .eq('id', setlistId);
    
    if (updateError) {
      console.error("Error updating setlist timestamp:", updateError);
      // Non-critical error, we'll continue
    }
    
    console.log(`Song added to setlist with ID: ${data.id}`);
    return data.id;
  } catch (error) {
    console.error("Error in addSongToSetlist:", error);
    return null;
  }
}

/**
 * Vote for a song in a setlist
 */
export async function voteForSetlistSong(setlistSongId: string, userId: string) {
  try {
    if (!setlistSongId || !userId) {
      console.error("Missing required parameters for voting");
      return false;
    }
    
    console.log(`User ${userId} voting for setlist song ${setlistSongId}`);
    
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
      return true; // Already voted is considered successful
    }
    
    // Add vote to votes table
    const { error: voteError } = await supabase
      .from('votes')
      .insert({
        setlist_song_id: setlistSongId,
        user_id: userId,
        created_at: new Date().toISOString()
      });
    
    if (voteError) {
      // If duplicate vote, ignore (should be caught by check above, but just in case)
      if (voteError.code === '23505') { // Unique constraint violation
        console.log("Duplicate vote detected");
        return true;
      }
      
      console.error("Error adding vote record:", voteError);
      return false;
    }
    
    // Increment vote count via the RPC function to ensure atomic updates
    try {
      const { error: incrementError } = await supabase.rpc(
        'increment_song_vote',
        { song_id: setlistSongId }
      );
      
      if (incrementError) {
        console.error("Error incrementing vote count:", incrementError);
        return false;
      }
    } catch (error) {
      console.error("Error calling increment_song_vote function:", error);
      return false;
    }
    
    console.log("Vote successfully recorded");
    return true;
  } catch (error) {
    console.error("Error in voteForSetlistSong:", error);
    return false;
  }
}

// Interface for setlist songs to fix type issues
interface SetlistSong {
  id: string;
  setlistSongId: string;
  name: string;
  votes: number;
  userVoted: boolean;
  artistId?: string;
  albumName?: string;
  albumImageUrl?: string;
}

/**
 * Get all songs for a setlist with vote counts
 */
export async function getSetlistSongs(setlistId: string, userId?: string): Promise<SetlistSong[]> {
  try {
    console.log(`Getting songs for setlist ${setlistId}`);
    
    // Get all songs in the setlist
    const { data: setlistSongs, error: songsError } = await supabase
      .from('setlist_songs')
      .select(`
        id,
        track_id,
        votes,
        top_tracks (
          id,
          name,
          artist_id,
          album_name,
          album_image_url
        )
      `)
      .eq('setlist_id', setlistId)
      .order('votes', { ascending: false });
    
    if (songsError) {
      console.error("Error fetching setlist songs:", songsError);
      return [];
    }
    
    if (!setlistSongs || setlistSongs.length === 0) {
      console.log("No songs found in setlist");
      return [];
    }
    
    console.log(`Found ${setlistSongs.length} songs in setlist`);
    
    // Check which songs the user has voted for
    let userVotedSongs: string[] = [];
    
    if (userId) {
      const { data: votes, error: votesError } = await supabase
        .from('votes')
        .select('setlist_song_id')
        .eq('user_id', userId);
      
      if (votesError) {
        console.error("Error fetching user votes:", votesError);
      } else if (votes) {
        userVotedSongs = votes.map(vote => vote.setlist_song_id);
        console.log(`User has voted for ${userVotedSongs.length} songs`);
      }
    }
    
    // Map the results to a clean format
    const formattedSongs: SetlistSong[] = setlistSongs.map(song => {
      // Get track data, if available
      const trackData = song.top_tracks;
      
      return {
        id: song.track_id, // Use the actual track_id for consistency
        setlistSongId: song.id, // Store the setlist_song_id for voting
        name: trackData ? trackData.name : `Song ${song.track_id.substring(0, 6)}`,
        votes: song.votes || 0,
        userVoted: userVotedSongs.includes(song.id),
        // Additional track data if available
        artistId: trackData ? trackData.artist_id : undefined,
        albumName: trackData ? trackData.album_name : undefined,
        albumImageUrl: trackData ? trackData.album_image_url : undefined
      };
    });
    
    return formattedSongs;
  } catch (error) {
    console.error("Error in getSetlistSongs:", error);
    return [];
  }
}
