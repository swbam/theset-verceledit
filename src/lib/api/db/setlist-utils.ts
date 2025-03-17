import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface SetlistSong {
  id: string;
  name: string;
  votes: number;
  userVoted?: boolean;
}

export const getSetlistSongs = async (setlistId: string, userId?: string): Promise<SetlistSong[]> => {
  try {
    // First get all songs in the setlist
    const { data: songs, error } = await supabase
      .from('setlist_songs')
      .select('id, name, votes')
      .eq('setlist_id', setlistId)
      .order('votes', { ascending: false });

    if (error) throw error;

    // If no user ID, just return the songs without user vote info
    if (!userId) {
      return songs as SetlistSong[];
    }

    // Get the user's votes for this setlist
    const { data: userVotes, error: votesError } = await supabase
      .from('setlist_votes')
      .select('song_id')
      .eq('user_id', userId)
      .eq('setlist_id', setlistId);

    if (votesError) throw votesError;

    // Create a set of song IDs the user has voted for
    const userVotedSongIds = new Set(userVotes.map(vote => vote.song_id));

    // Add the userVoted flag to each song
    return songs.map(song => ({
      ...song,
      userVoted: userVotedSongIds.has(song.id)
    })) as SetlistSong[];
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
      .from('setlist_votes')
      .select('id')
      .eq('setlist_id', setlistId)
      .eq('song_id', songId)
      .eq('user_id', userId)
      .single();

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
      .from('setlist_votes')
      .insert({
        setlist_id: setlistId,
        song_id: songId,
        user_id: userId
      });

    if (voteError) throw voteError;

    // Increment the vote count for the song
    const { error: updateError } = await supabase.rpc('increment_song_votes', {
      p_setlist_id: setlistId,
      p_song_id: songId
    });

    if (updateError) throw updateError;

    return true;
  } catch (error) {
    console.error('Error voting for song:', error);
    toast.error('Failed to register your vote. Please try again.');
    return false;
  }
};

export const addSongToSetlist = async (
  setlistId: string,
  songId: string,
  songName: string
): Promise<boolean> => {
  try {
    // Check if the song already exists in the setlist
    const { data: existingSong, error: checkError } = await supabase
      .from('setlist_songs')
      .select('id')
      .eq('setlist_id', setlistId)
      .eq('id', songId)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      throw checkError;
    }

    if (existingSong) {
      // Song already exists in the setlist
      return false;
    }

    // Add the song to the setlist
    const { error: insertError } = await supabase
      .from('setlist_songs')
      .insert({
        id: songId,
        setlist_id: setlistId,
        name: songName,
        votes: 0
      });

    if (insertError) throw insertError;

    return true;
  } catch (error) {
    console.error('Error adding song to setlist:', error);
    return false;
  }
};

export const addTracksToSetlist = async (
  setlistId: string,
  trackIds: string[]
): Promise<void> => {
  try {
    // Fix for line 116 - ensure the array being pushed to accepts strings
    const tracksToAdd: string[] = trackIds;
    
    // Process each track ID
    for (const trackId of tracksToAdd) {
      // Fetch track details from Spotify API or your database
      // Add the track to the setlist
      await addSongToSetlist(setlistId, trackId, `Track ${trackId}`);
    }
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
    const { data, error } = await supabase
      .from('setlists')
      .insert({
        show_id: showId,
        created_by: createdBy
      })
      .select('id')
      .single();

    if (error) throw error;
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
