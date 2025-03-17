
import { supabase } from "@/integrations/supabase/client";
import { SpotifyTrack } from "@/lib/spotify/types";
import { Json } from "@/integrations/supabase/types";
import { getArtistTopTracksFromDb } from "@/lib/spotify/utils";

/**
 * Get or create a setlist for a show
 */
export async function getOrCreateSetlistForShow(showId: string, artistId?: string): Promise<string | null> {
  try {
    if (!showId) return null;
    
    console.log(`Getting or creating setlist for show ${showId} with artist ${artistId || 'unknown'}`);
    
    // Check if setlist exists
    const { data: existingSetlist, error: checkError } = await supabase
      .from('setlists')
      .select('id')
      .eq('show_id', showId)
      .maybeSingle();
    
    if (checkError) {
      console.error("Error checking if setlist exists:", checkError);
      return null;
    }
    
    // If setlist exists, return it
    if (existingSetlist) {
      console.log(`Found existing setlist ${existingSetlist.id} for show ${showId}`);
      return existingSetlist.id;
    }
    
    // Create new setlist
    console.log(`Creating new setlist for show ${showId}`);
    const { data: newSetlist, error: createError } = await supabase
      .from('setlists')
      .insert({
        show_id: showId,
        last_updated: new Date().toISOString()
      })
      .select('id')
      .single();
    
    if (createError) {
      console.error("Error creating setlist:", createError);
      return null;
    }
    
    console.log(`Created new setlist ${newSetlist.id} for show ${showId}`);
    
    // If we have an artist ID, auto-populate the setlist with random tracks
    if (artistId) {
      await autoPopulateSetlistWithRandomTracks(newSetlist.id, artistId);
    } else {
      console.warn("No artist_id provided for setlist creation, cannot auto-populate with tracks");
    }
    
    return newSetlist.id;
  } catch (error) {
    console.error("Error in getOrCreateSetlist:", error);
    return null;
  }
}

/**
 * Auto-populate a setlist with random tracks from an artist
 */
async function autoPopulateSetlistWithRandomTracks(setlistId: string, artistId: string, trackCount: number = 5) {
  try {
    console.log(`Auto-populating setlist ${setlistId} with ${trackCount} tracks from artist ${artistId}`);
    
    // Get tracks for the artist
    const tracks = await getTracksForArtist(artistId);
    
    if (!tracks || tracks.length === 0) {
      console.error(`No tracks found for artist ${artistId}, cannot auto-populate setlist`);
      return;
    }
    
    console.log(`Found ${tracks.length} tracks for artist ${artistId}, selecting ${trackCount} random tracks`);
    
    // Randomly select tracks
    const selectedTracks = selectRandomTracks(tracks, trackCount);
    
    // Add tracks to setlist
    await addTracksToSetlist(setlistId, selectedTracks);
    
  } catch (error) {
    console.error("Error in autoPopulateSetlistWithRandomTracks:", error);
  }
}

/**
 * Get tracks for an artist, first trying stored_tracks, then the top_tracks table
 */
async function getTracksForArtist(artistId: string): Promise<SpotifyTrack[]> {
  // First check if the artist has stored_tracks in their record
  const { data: artist, error: artistError } = await supabase
    .from('artists')
    .select('stored_tracks')
    .eq('id', artistId)
    .single();
  
  if (!artistError && artist?.stored_tracks && Array.isArray(artist.stored_tracks) && artist.stored_tracks.length > 0) {
    console.log(`Using ${artist.stored_tracks.length} tracks from artist.stored_tracks`);
    // Cast the JSON to SpotifyTrack[] with an intermediate unknown cast for type safety
    return artist.stored_tracks as unknown as SpotifyTrack[];
  }
  
  // Fallback to top_tracks table
  console.log(`No stored_tracks found for artist ${artistId}, fetching from top_tracks table`);
  return await getArtistTopTracksFromDb(artistId, 20);
}

/**
 * Randomly select tracks from a list
 */
function selectRandomTracks(tracks: SpotifyTrack[], count: number): SpotifyTrack[] {
  if (!tracks || tracks.length === 0) return [];
  if (tracks.length <= count) return tracks;
  
  const shuffled = [...tracks].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

/**
 * Add tracks to a setlist
 */
async function addTracksToSetlist(setlistId: string, tracks: SpotifyTrack[]) {
  if (!tracks || tracks.length === 0) {
    console.log("No tracks to add to setlist");
    return;
  }
  
  console.log(`Adding ${tracks.length} tracks to setlist ${setlistId}`);
  
  // Prepare tracks for insertion
  const tracksToInsert = tracks.map(track => ({
    setlist_id: setlistId,
    track_id: track.id,
    votes: 0
  }));
  
  // Insert tracks into setlist_songs table
  const { error } = await supabase
    .from('setlist_songs')
    .insert(tracksToInsert);
  
  if (error) {
    console.error("Error adding tracks to setlist:", error);
  } else {
    console.log(`Successfully added ${tracks.length} tracks to setlist ${setlistId}`);
  }
}

/**
 * Get all songs in a setlist with their track details
 */
export async function getSetlistSongs(setlistId: string) {
  try {
    if (!setlistId) return [];
    
    console.log(`Getting all songs in setlist ${setlistId}`);
    
    const { data, error } = await supabase
      .from('setlist_songs')
      .select(`
        id,
        track_id,
        votes,
        suggested_by,
        top_tracks (
          name,
          spotify_url,
          preview_url,
          album_name,
          album_image_url
        )
      `)
      .eq('setlist_id', setlistId);
    
    if (error) {
      console.error("Error getting songs in setlist:", error);
      return [];
    }
    
    if (!data || data.length === 0) {
      console.log(`No songs found in setlist ${setlistId}`);
      return [];
    }
    
    console.log(`Found ${data.length} songs in setlist ${setlistId}`);
    
    // Map the data to the SpotifyTrack interface
    const songs: SpotifyTrack[] = data.map(item => {
      const track = item.top_tracks as any;
      return {
        id: item.track_id,
        name: track?.name || 'Unknown',
        uri: track?.spotify_url || null,
        preview_url: track?.preview_url || null,
        album: {
          name: track?.album_name || 'Unknown',
          images: track?.album_image_url ? [{ url: track.album_image_url }] : []
        },
        artists: [{ name: 'Unknown' }], // Artist info not directly available,
        votes: item.votes,
        setlist_song_id: item.id,
        suggested_by: item.suggested_by
      };
    });
    
    return songs;
  } catch (error) {
    console.error("Error in getSetlistSongs:", error);
    return [];
  }
}

/**
 * Add a song to a setlist
 */
export async function addSongToSetlist(setlistId: string, trackId: string, userId?: string) {
  try {
    if (!setlistId || !trackId) {
      console.error("Invalid parameters for addSongToSetlist");
      return null;
    }
    
    console.log(`Adding song ${trackId} to setlist ${setlistId}`);
    
    // Check if the song is already in the setlist
    const { data: existingSong, error: checkError } = await supabase
      .from('setlist_songs')
      .select('id')
      .eq('setlist_id', setlistId)
      .eq('track_id', trackId)
      .maybeSingle();
    
    if (checkError) {
      console.error("Error checking if song exists in setlist:", checkError);
      return null;
    }
    
    if (existingSong) {
      console.log(`Song ${trackId} already exists in setlist ${setlistId}`);
      return existingSong.id;
    }
    
    // Add the song to the setlist
    const { data: newSong, error: insertError } = await supabase
      .from('setlist_songs')
      .insert({
        setlist_id: setlistId,
        track_id: trackId,
        votes: 0,
        suggested_by: userId || null
      })
      .select('id')
      .single();
    
    if (insertError) {
      console.error("Error adding song to setlist:", insertError);
      return null;
    }
    
    console.log(`Successfully added song ${trackId} to setlist ${setlistId}`);
    return newSong.id;
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
      console.error("Invalid parameters for voteForSetlistSong");
      return false;
    }
    
    console.log(`User ${userId} voting for song ${setlistSongId}`);
    
    // Check if the user has already voted for this song
    const { data: existingVote, error: checkError } = await supabase
      .from('votes')
      .select('id')
      .eq('setlist_song_id', setlistSongId)
      .eq('user_id', userId)
      .maybeSingle();
    
    if (checkError) {
      console.error("Error checking if user has already voted:", checkError);
      return false;
    }
    
    if (existingVote) {
      console.log(`User ${userId} has already voted for song ${setlistSongId}`);
      return false;
    }
    
    // Add the vote
    const { error: voteError } = await supabase
      .from('votes')
      .insert({
        setlist_song_id: setlistSongId,
        user_id: userId
      });
    
    if (voteError) {
      console.error("Error adding vote:", voteError);
      return false;
    }
    
    // Increment the vote count on the setlist_songs table
    const { error: incrementError } = await supabase
      .from('setlist_songs')
      .update({ votes: 1 }) // Use explicit number value instead of a function
      .eq('id', setlistSongId);
    
    if (incrementError) {
      console.error("Error incrementing vote count:", incrementError);
      return false;
    }
    
    console.log(`User ${userId} successfully voted for song ${setlistSongId}`);
    return true;
  } catch (error) {
    console.error("Error in voteForSetlistSong:", error);
    return false;
  }
}
