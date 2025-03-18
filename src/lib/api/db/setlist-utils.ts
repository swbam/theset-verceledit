import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface SetlistSong {
  id: string;
  name: string;
  votes: number;
  userVoted?: boolean;
  setlistSongId?: string;  // Added to store the database ID 
  albumName?: string;      // Added these properties to match usage in other files
  albumImageUrl?: string;
  artistName?: string;
}

export const getSetlistSongs = async (setlistId: string, userId?: string): Promise<SetlistSong[]> => {
  try {
    // First get all songs in the setlist
    const { data: songs, error } = await supabase
      .from('setlist_songs')
      .select('id, setlist_id, track_id, votes')
      .eq('setlist_id', setlistId)
      .order('votes', { ascending: false });

    if (error) throw error;
    
    if (!songs) return [];

    // Get the song details from top_tracks for each song
    const songDetails = [];
    
    for (const song of songs) {
      // Get track details from top_tracks table
      const { data: trackData, error: trackError } = await supabase
        .from('top_tracks')
        .select('id, name, album_name, album_image_url')
        .eq('id', song.track_id)
        .maybeSingle();
      
      if (trackError && trackError.code !== 'PGRST116') {
        console.error('Error fetching track details:', trackError);
        continue;
      }

      // Create a combined song object
      songDetails.push({
        id: song.track_id,             // Use track_id as the song ID
        name: trackData?.name || `Track ${song.track_id.substring(0, 6)}`,
        votes: song.votes,
        userVoted: false,              // Will be updated below if user ID is provided
        setlistSongId: song.id,        // Store the setlist_songs table ID
        albumName: trackData?.album_name,
        albumImageUrl: trackData?.album_image_url
      });
    }

    // If no user ID, just return the songs without user vote info
    if (!userId) {
      return songDetails;
    }

    // Get the user's votes for this setlist
    const { data: userVotes, error: votesError } = await supabase
      .from('votes')
      .select('setlist_song_id')
      .eq('user_id', userId);

    if (votesError) throw votesError;

    // Create a set of song IDs the user has voted for
    const userVotedSongIds = new Set(userVotes?.map(vote => vote.setlist_song_id) || []);

    // Add the userVoted flag to each song
    return songDetails.map(song => ({
      ...song,
      userVoted: userVotedSongIds.has(song.setlistSongId || '')
    }));
  } catch (error) {
    console.error('Error fetching setlist songs:', error);
    return [];
  }
};

export const voteForSong = async (
  setlistId: string,
  songId: string,
  userId: string
): Promise<boolean> => {
  try {
    // Check if the user has already voted for this song
    const { data: existingVote, error: checkError } = await supabase
      .from('votes')
      .select('id')
      .eq('setlist_song_id', songId)
      .eq('user_id', userId)
      .maybeSingle();

    if (checkError && checkError.code !== 'PGRST116') {
      // PGRST116 means no rows returned, which is expected if user hasn't voted
      throw checkError;
    }

    if (existingVote) {
      // User has already voted for this song
      toast.info("You've already voted for this song!");
      return false;
    }

    // Add the vote
    const { error: voteError } = await supabase
      .from('votes')
      .insert({
        setlist_song_id: songId,
        user_id: userId
      });

    if (voteError) throw voteError;

    // Use the correctly named RPC function to increment votes
    const { error: updateError } = await supabase
      .rpc('increment_votes', { song_id: songId });

    if (updateError) {
      console.error('Error incrementing votes:', updateError);
      
      // Fallback method if the RPC fails - manually update the votes count
      const { data: currentVotes, error: getError } = await supabase
        .from('setlist_songs')
        .select('votes')
        .eq('id', songId)
        .single();
        
      if (getError) throw getError;
      
      // Get the current vote count as a number
      const currentVoteCount = typeof currentVotes?.votes === 'number' ? currentVotes.votes : 0;
      const newVoteCount = currentVoteCount + 1;
      
      const { error: manualUpdateError } = await supabase
        .from('setlist_songs')
        .update({ votes: newVoteCount })
        .eq('id', songId);
        
      if (manualUpdateError) throw manualUpdateError;
    }

    return true;
  } catch (error) {
    console.error('Error voting for song:', error);
    toast.error('Failed to register your vote. Please try again.');
    return false;
  }
};

// This is needed for re-export clarity
export const voteForSetlistSong = voteForSong;

export const addSongToSetlist = async (
  setlistId: string,
  trackId: string,
  songName?: string
): Promise<string | null> => {
  try {
    console.log(`Adding song to setlist: ${setlistId}, track: ${trackId}, name: ${songName}`);
    
    // Check if the song already exists in the setlist
    const { data: existingSong, error: checkError } = await supabase
      .from('setlist_songs')
      .select('id')
      .eq('setlist_id', setlistId)
      .eq('track_id', trackId)
      .maybeSingle();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error("Error checking for existing song:", checkError);
      throw checkError;
    }

    if (existingSong) {
      // Song already exists in the setlist
      console.log(`Song ${trackId} already exists in setlist ${setlistId}, ID: ${existingSong.id}`);
      return existingSong.id;
    }

    // Get track info if songName not provided
    if (!songName) {
      const { data: trackData, error: trackError } = await supabase
        .from('top_tracks')
        .select('name')
        .eq('id', trackId)
        .maybeSingle();
      
      if (!trackError && trackData) {
        songName = trackData.name;
      } else {
        console.log("Could not find track name in database, using default");
        songName = `Track ${trackId.substring(0, 8)}`;
      }
    }

    console.log(`Inserting song "${songName}" (${trackId}) into setlist ${setlistId}`);
    
    // Add the song to the setlist
    const { data, error: insertError } = await supabase
      .from('setlist_songs')
      .insert({
        setlist_id: setlistId,
        track_id: trackId,
        votes: 0
      })
      .select('id')
      .single();

    if (insertError) {
      console.error("Error inserting song:", insertError);
      throw insertError;
    }

    console.log(`Successfully added song to setlist, ID: ${data?.id}`);
    return data?.id || null;
  } catch (error) {
    console.error('Error adding song to setlist:', error);
    return null;
  }
};

export const addTracksToSetlist = async (
  setlistId: string,
  trackIds: string[],
  trackNames: Record<string, string> = {}
): Promise<void> => {
  try {
    console.log(`Batch adding ${trackIds.length} tracks to setlist ${setlistId}`);
    
    // Prepare all songs for insertion at once
    const songsToInsert = trackIds.map(trackId => ({
      setlist_id: setlistId,
      track_id: trackId,
      votes: 0, // Explicitly set to 0
      suggested_by: null,
      created_at: new Date().toISOString()
    }));
    
    // Bulk insert all songs at once
    const { data, error } = await supabase
      .from('setlist_songs')
      .insert(songsToInsert)
      .select();
      
    if (error) {
      console.error('Error batch inserting songs to setlist:', error);
      throw error;
    }
    
    console.log(`Successfully added ${data.length} tracks to setlist ${setlistId}`);
  } catch (error) {
    console.error('Error adding tracks to setlist:', error);
    throw error;
  }
};

export const createSetlist = async (
  showId: string,
  createdBy: string
): Promise<string | null> => {
  try {
    console.log(`Creating setlist for show ID: ${showId}`);
    
    // Check if a setlist already exists for this show
    const { data: existingSetlist, error: checkError } = await supabase
      .from('setlists')
      .select('id')
      .eq('show_id', showId)
      .maybeSingle();
    
    if (checkError) {
      console.error('Error checking for existing setlist:', checkError);
      return null;
    }
    
    if (existingSetlist?.id) {
      console.log(`Found existing setlist: ${existingSetlist.id}`);
      return existingSetlist.id;
    }
    
    // Create a new setlist
    const { data, error } = await supabase
      .from('setlists')
      .insert({
        show_id: showId,
        created_by: createdBy
      })
      .select('id')
      .single();

    if (error) {
      console.error('Error creating setlist:', error);
      throw error;
    }
    
    console.log(`Created new setlist: ${data.id}`);
    return data.id;
  } catch (error) {
    console.error('Error creating setlist:', error);
    return null;
  }
};

export const getSetlistForShow = async (
  showId: string,
  userId?: string
): Promise<{ id: string; songs: SetlistSong[] } | null> => {
  try {
    // Get the setlist for this show
    const { data: setlist, error } = await supabase
      .from('setlists')
      .select('id')
      .eq('show_id', showId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No setlist found for this show
        return null;
      }
      throw error;
    }

    // Get the songs for this setlist
    const songs = await getSetlistSongs(setlist.id, userId);

    return {
      id: setlist.id,
      songs
    };
  } catch (error) {
    console.error('Error getting setlist for show:', error);
    return null;
  }
};
