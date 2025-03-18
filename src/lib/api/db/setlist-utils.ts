import { supabase, supabaseAdmin } from '@/lib/supabase';
import { toast } from 'sonner';
import { PastSetlist } from '@/types/artist';

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

    // If we get an authentication error and admin client is available, try with admin client
    if (insertError && (insertError.code === '401' || insertError.message?.includes('unauthorized')) && supabaseAdmin) {
      console.log('Using admin client for adding song due to auth error');
      const { data: adminData, error: adminError } = await supabaseAdmin
        .from('setlist_songs')
        .insert({
          setlist_id: setlistId,
          track_id: trackId,
          votes: 0
        })
        .select('id')
        .single();
        
      if (!adminError && adminData?.id) {
        console.log(`Successfully added song with admin client: ${adminData.id}`);
        return adminData.id;
      }
      
      if (adminError) {
        console.error('Error adding song with admin client:', adminError);
        throw adminError;
      }
    }

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
    
    // Try with regular client first
    const { data, error } = await supabase
      .from('setlist_songs')
      .insert(songsToInsert)
      .select();
      
    // If we get an authentication error and admin client is available, try with admin client
    if (error && (error.code === '401' || error.message?.includes('unauthorized')) && supabaseAdmin) {
      console.log('Using admin client for adding tracks due to auth error');
      const { data: adminData, error: adminError } = await supabaseAdmin
        .from('setlist_songs')
        .insert(songsToInsert)
        .select();
        
      if (!adminError && adminData) {
        console.log(`Successfully added ${adminData.length} tracks to setlist with admin client`);
        return;
      }
      
      if (adminError) {
        console.error('Error adding tracks with admin client:', adminError);
        throw adminError;
      }
    }
    
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
  createdBy?: string
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
      // Continue anyway - we'll try to create a new one
    }
    
    if (existingSetlist?.id) {
      console.log(`Found existing setlist: ${existingSetlist.id}`);
      return existingSetlist.id;
    }
    
    // Create a new setlist
    try {
      const timestamp = new Date().toISOString();
      const setlistData = {
        show_id: showId,
        created_at: timestamp,
        last_updated: timestamp
      };
      
      console.log(`Attempting to create setlist with data:`, setlistData);
      
      // Try with regular client first
      const { data, error } = await supabase
        .from('setlists')
        .insert(setlistData)
        .select('id')
        .single();
        
      // If we get an authentication error and admin client is available, try with admin client
      if (error && (error.code === '401' || error.message?.includes('unauthorized')) && supabaseAdmin) {
        console.log('Using admin client for setlist creation due to auth error');
        const { data: adminData, error: adminError } = await supabaseAdmin
          .from('setlists')
          .insert(setlistData)
          .select('id')
          .single();
          
        if (!adminError && adminData?.id) {
          console.log(`Created new setlist with admin client: ${adminData.id}`);
          return adminData.id;
        }
        
        if (adminError) {
          console.error('Error creating setlist with admin client:', adminError);
        }
      }

      if (error) {
        // Log detailed error information
        console.error('Error creating setlist:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        });
        
        // Check if it's a duplicate key error (someone else might have created it)
        if (error.code === '23505') {
          console.log(`Duplicate key error - setlist may already exist for show ${showId}`);
          
          // Try to get the setlist again
          const { data: retrySetlist } = await supabase
            .from('setlists')
            .select('id')
            .eq('show_id', showId)
            .maybeSingle();
            
          if (retrySetlist?.id) {
            console.log(`Found existing setlist on retry: ${retrySetlist.id}`);
            return retrySetlist.id;
          }
        }
        
        throw error;
      }
      
      if (!data?.id) {
        console.error('No setlist ID returned after creation');
        return null;
      }
      
      console.log(`Created new setlist: ${data.id}`);
      return data.id;
    } catch (insertError) {
      console.error('Exception during setlist creation:', insertError);
      
      // One last attempt to find an existing setlist
      try {
        const { data: lastAttemptSetlist } = await supabase
          .from('setlists')
          .select('id')
          .eq('show_id', showId)
          .maybeSingle();
          
        if (lastAttemptSetlist?.id) {
          console.log(`Found setlist in last attempt: ${lastAttemptSetlist.id}`);
          return lastAttemptSetlist.id;
        }
      } catch (finalError) {
        console.error('Final attempt to find setlist failed:', finalError);
      }
      
      return null;
    }
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

/**
 * Saves past setlists to the database
 * @param artistId The ID of the artist
 * @param setlists Array of setlists to save
 * @returns Boolean indicating success
 */
export async function savePastSetlistsToDatabase(
  artistId: string, 
  setlists: PastSetlist[]
): Promise<boolean> {
  try {
    if (!artistId || !setlists || setlists.length === 0) {
      console.warn("Invalid input for savePastSetlistsToDatabase. Skipping save.");
      return false;
    }
    
    console.log(`Saving ${setlists.length} past setlists for artist ${artistId}`);
    
    // First, ensure all venues exist in the database
    const venueIds = new Map<string, string>();
    
    for (const setlist of setlists) {
      if (!setlist.venue || !setlist.venue.name) continue;
      
      // Generate a unique key for this venue
      const venueKey = `${setlist.venue.name}:${setlist.venue.city || ''}:${setlist.venue.state || ''}`;
      
      // Skip if we've already processed this venue
      if (venueIds.has(venueKey)) continue;
      
      // Check if venue exists
      const { data: existingVenues } = await supabase
        .from('venues')
        .select('id')
        .eq('name', setlist.venue.name)
        .eq('city', setlist.venue.city || '')
        .eq('state', setlist.venue.state || '')
        .limit(1);
      
      if (existingVenues && existingVenues.length > 0) {
        // Venue exists, store its ID
        venueIds.set(venueKey, existingVenues[0].id);
      } else {
        // Venue doesn't exist, create it
        const { data: newVenue, error } = await supabase
          .from('venues')
          .insert({
            name: setlist.venue.name,
            city: setlist.venue.city,
            state: setlist.venue.state,
            country: setlist.venue.country
          })
          .select('id')
          .single();
        
        if (error) {
          console.error("Error creating venue:", error);
          continue;
        }
        
        if (newVenue) {
          venueIds.set(venueKey, newVenue.id);
        }
      }
    }
    
    // Now save the setlists
    for (const setlist of setlists) {
      if (!setlist.venue || !setlist.venue.name) continue;
      
      const venueKey = `${setlist.venue.name}:${setlist.venue.city || ''}:${setlist.venue.state || ''}`;
      const venueId = venueIds.get(venueKey);
      
      if (!venueId) {
        console.error(`Could not find venue ID for ${setlist.venue.name}. Skipping setlist.`);
        continue;
      }
      
      // Check if setlist already exists
      const { data: existingSetlists } = await supabase
        .from('past_setlists')
        .select('id')
        .eq('id', setlist.id)
        .limit(1);
      
      if (existingSetlists && existingSetlists.length > 0) {
        // Setlist exists, update it
        const { error } = await supabase
          .from('past_setlists')
          .update({
            date: setlist.date,
            venue_id: venueId,
            songs: setlist.songs,
            updated_at: new Date().toISOString()
          })
          .eq('id', setlist.id);
        
        if (error) {
          console.error(`Error updating setlist ${setlist.id}:`, error);
        }
      } else {
        // Setlist doesn't exist, create it
        const { error } = await supabase
          .from('past_setlists')
          .insert({
            id: setlist.id,
            date: setlist.date,
            venue_id: venueId,
            artist_id: artistId,
            songs: setlist.songs
          });
        
        if (error) {
          console.error(`Error creating setlist:`, error);
        }
      }
    }
    
    // Update artist's setlists_last_updated timestamp
    await supabase
      .from('artists')
      .update({
        setlists_last_updated: new Date().toISOString()
      })
      .eq('id', artistId);
    
    return true;
  } catch (error) {
    console.error("Error in savePastSetlistsToDatabase:", error);
    return false;
  }
}

/**
 * Creates a setlist for a new show
 * @param showId The ID of the show
 * @param artistId The ID of the artist
 * @param tracks Array of tracks to add to the setlist
 * @returns The ID of the created setlist
 */
export async function createSetlistForShow(
  showId: string,
  artistId: string,
  tracks: Array<{ id: string; title: string; album?: string; spotify_url?: string }>
): Promise<string | null> {
  try {
    // Create the setlist
    const { data: setlist, error: setlistError } = await supabase
      .from('setlists')
      .insert({
        show_id: showId,
        artist_id: artistId,
        is_active: true
      })
      .select('id')
      .single();
    
    if (setlistError) {
      console.error("Error creating setlist:", setlistError);
      return null;
    }
    
    if (!setlist) {
      console.error("No setlist created");
      return null;
    }
    
    // Add tracks to the setlist
    const setlistSongs = tracks.map(track => ({
      setlist_id: setlist.id,
      title: track.title,
      album: track.album,
      spotify_url: track.spotify_url,
      track_id: track.id,
      vote_count: 0
    }));
    
    const { error: songsError } = await supabase
      .from('setlist_songs')
      .insert(setlistSongs);
    
    if (songsError) {
      console.error("Error adding songs to setlist:", songsError);
      return null;
    }
    
    return setlist.id;
  } catch (error) {
    console.error("Error in createSetlistForShow:", error);
    return null;
  }
}

/**
 * Fetches the most active show with voting data
 * @returns The most active show with voting data and top songs
 */
export async function fetchMostActiveVotingShow() {
  try {
    // First, find the setlist with the most votes
    const { data: activeSetlists, error: setlistsError } = await supabase
      .from('setlists')
      .select(`
        id,
        show_id,
        shows (
          id,
          name,
          date,
          image_url,
          ticket_url,
          artist_id,
          artists (
            id,
            name
          )
        )
      `)
      .order('vote_count', { ascending: false })
      .limit(1);
    
    if (setlistsError) {
      console.error('Error fetching active setlists:', setlistsError);
      return null;
    }
    
    if (!activeSetlists || activeSetlists.length === 0) {
      console.log('No active setlists found');
      return null;
    }
    
    const activeSetlist = activeSetlists[0];
    const show = activeSetlist.shows;
    
    if (!show) {
      console.error('Show data not found for setlist:', activeSetlist.id);
      return null;
    }
    
    // Get the top songs for this setlist
    const { data: songs, error: songsError } = await supabase
      .from('setlist_songs')
      .select(`
        id,
        track_id,
        votes,
        top_tracks (
          id,
          name,
          album_name,
          album_image_url
        )
      `)
      .eq('setlist_id', activeSetlist.id)
      .order('votes', { ascending: false })
      .limit(5);
    
    if (songsError) {
      console.error('Error fetching top songs:', songsError);
      return null;
    }
    
    // Prepare the response
    return {
      id: show.id,
      name: show.name,
      date: show.date,
      image_url: show.image_url,
      ticket_url: show.ticket_url,
      artist: show.artists,
      votes_count: activeSetlist.vote_count || 0,
      top_songs: songs.map(song => ({
        id: song.track_id,
        name: song.top_tracks?.name || `Unknown Song`,
        votes: song.votes
      }))
    };
  } catch (error) {
    console.error('Error in fetchMostActiveVotingShow:', error);
    return null;
  }
}
