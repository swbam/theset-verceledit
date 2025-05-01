import { createClient } from '@supabase/supabase-js';
import { clientConfig, serverConfig, validateServerConfig } from '@/integrations/config';

// Validate server config on module load (assuming this is server-side only)
if (typeof window === 'undefined') {
  validateServerConfig();
}

// Create Supabase client with admin access using service key
const supabase = createClient(
  clientConfig.supabase.url, // Public URL
  serverConfig.supabase.serviceKey // Service Role Key for admin operations
);

// NOTE: Initial setlist creation logic moved to src/lib/sync/show-service.ts
/*
export async function createSetlistForShow(showId: string, artistId: string) {
  try {
    console.log(`Creating setlist for show ${showId}`);

    // Check if setlist already exists
    const { data: existingSetlist, error: checkError } = await supabase
      .from('setlists')
      .select('id')
      .eq('show_id', showId)
      .maybeSingle();

    if (checkError) {
      console.error("Error checking for existing setlist:", checkError);
      return null;
    }

    // If setlist exists, return its ID
    if (existingSetlist) {
      console.log(`Setlist already exists for show ${showId}: ${existingSetlist.id}`);
      return existingSetlist.id;
    }

    // Get show details for date and venue information
    const { data: show, error: showError } = await supabase
      .from('shows')
      .select('date, venue_id, venue:venues(name, city)')
      .eq('id', showId)
      .single();

    if (showError || !show) {
      console.error("Error getting show details:", showError);
      return null;
    }

    // Create new setlist
    const { data: newSetlist, error: createError } = await supabase
      .from('setlists')
      .insert({
        artist_id: artistId,
        show_id: showId,
        date: show.date,
        venue: show.venue?.name || null,
        venue_city: show.venue?.city || null,
      })
      .select()
      .single();

    if (createError) {
      console.error("Error creating setlist:", createError);
      return null;
    }

    console.log(`Created setlist ${newSetlist.id} for show ${showId}`);

    // Populate setlist with songs
    await populateSetlistWithSongs(newSetlist.id, artistId);

    return newSetlist.id;
  } catch (error) {
    console.error("Error in createSetlistForShow:", error);
    return null;
  }
}
*/

/*
async function populateSetlistWithSongs(setlistId: string, artistId: string) {
  try {
    console.log(`Populating setlist ${setlistId} with songs from artist ${artistId}`);

    // Get artist's songs from the database
    const { data: songs, error: songsError } = await supabase
      .from('songs')
      .select('id, name, spotify_id, duration_ms, preview_url, popularity')
      .eq('artist_id', artistId)
      .order('popularity', { ascending: false })
      .limit(50);

    if (songsError) {
      console.error("Error fetching songs for setlist:", songsError);
      return false;
    }

    // If we don't have songs, fetch them from Spotify
    if (!songs || songs.length === 0) {
      // Get the artist's Spotify ID
      const { data: artist, error: artistError } = await supabase
        .from('artists')
        .select('spotify_id')
        .eq('id', artistId)
        .maybeSingle();

      if (artistError || !artist?.spotify_id) {
        console.error("Error getting artist Spotify ID:", artistError);
        return false;
      }

      // Import dynamically to avoid circular dependencies
      // const { fetchAndStoreArtistTracks } = await import('../database'); // This import is invalid

      // Fetch songs from Spotify - This logic should be elsewhere (e.g., song-service)
      // await fetchAndStoreArtistTracks(artistId, artist.spotify_id, "Artist");

      // Try again to get songs
      const { data: refreshedSongs, error: refreshError } = await supabase
        .from('songs')
        .select('id, name, spotify_id, duration_ms, preview_url, popularity')
        .eq('artist_id', artistId)
        .order('popularity', { ascending: false })
        .limit(50);

      if (refreshError || !refreshedSongs || refreshedSongs.length === 0) {
        console.error("Still couldn't get songs after fetching from Spotify:", refreshError);
        return false;
      }

      // Use the refreshed songs
      return await addSongsToSetlist(setlistId, artistId, refreshedSongs);
    }

    // Add songs to setlist
    return await addSongsToSetlist(setlistId, artistId, songs);
  } catch (error) {
    console.error("Error in populateSetlistWithSongs:", error);
    return false;
  }
}
*/

/*
async function addSongsToSetlist(setlistId: string, artistId: string, songs: {
  id: string;
  name: string;
  spotify_id?: string;
  duration_ms?: number;
  preview_url?: string | null;
  popularity?: number;
}[]) {
  try {
    // Select 5 random songs from the top 50
    const selectedSongs = songs
      .sort(() => 0.5 - Math.random())
      .slice(0, 5);

    if (selectedSongs.length === 0) {
      console.error("No songs available to add to setlist");
      return false;
    }

    // Prepare setlist songs data
    const setlistSongs = selectedSongs.map((song, index) => ({
      setlist_id: setlistId,
      song_id: song.id,
      name: song.name,
      position: index + 1,
      artist_id: artistId,
      vote_count: 0
    }));

    // Insert setlist songs - INCORRECT TABLE
    // const { error } = await supabase
    //   .from('setlist_songs') // Incorrect table
    //   .insert(setlistSongs);

    // if (error) {
    //   console.error("Error adding songs to setlist:", error);
    //   return false;
    // }

    // console.log(`Added ${setlistSongs.length} songs to setlist ${setlistId}`);
    return true; // Modified to just return true as insert is removed
  } catch (error) {
    console.error("Error in addSongsToSetlist:", error);
    return false;
  }
}
*/


// --- Getter functions (assuming they fetch HISTORICAL setlists) ---
// --- Corrected table name to 'played_setlist_songs' ---

/**
 * Get a specific setlist by its ID (likely setlist.fm ID) including played songs.
 */
export async function getSetlistById(id: string) {
  const { data, error } = await supabase
    .from('setlists')
    .select(`
      *,
      show:shows(*),
      artist:artists(*),
      songs:played_setlist_songs(position, info, is_encore, song:songs!song_id(id, name)) // Corrected table name and select
    `)
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching setlist by ID:', error);
    throw error; // Re-throw error for caller to handle
  }

  return data;
}

/**
 * Get all setlists for a specific artist, including played songs.
 */
export async function getSetlistsForArtist(artistId: string) {
  const { data, error } = await supabase
    .from('setlists')
    .select(`
      *,
      show:shows(*),
      songs:played_setlist_songs(position, info, is_encore, song:songs!song_id(id, name)) // Corrected table name and select
    `)
    .eq('artist_id', artistId)
    .order('date', { ascending: false });

  if (error) {
    console.error('Error fetching setlists for artist:', error);
    throw error; // Re-throw error
  }

  return data || [];
}

/**
 * Get the setlist associated with a specific show, including played songs.
 */
export async function getSetlistForShow(showId: string) {
  const { data, error } = await supabase
    .from('setlists')
    .select(`
      *,
      songs:played_setlist_songs(position, info, is_encore, song:songs!song_id(id, name)) // Corrected table name and select
    `)
    .eq('show_id', showId)
    .maybeSingle();

  if (error) {
    console.error('Error fetching setlist for show:', error);
    throw error; // Re-throw error
  }

  return data;
}

// Removed createOrUpdateSetlist RPC call - functionality unclear/potentially redundant
/**
 * Creates a new setlist for a show or updates an existing one.
 * This function ties a setlist to a show and populates it with songs from the artist.
 * 
 * @param showId - The ID of the show to create/update a setlist for
 * @param artistId - The ID of the artist whose songs will be used in the setlist
 * @returns The ID of the created/updated setlist, or null if the operation failed
 */
export async function createOrUpdateSetlist(showId: string, artistId: string): Promise<string | null> {
  try {
    console.log(`Creating/updating setlist for show ${showId} with artist ${artistId}`);

    // Check if setlist already exists
    const { data: existingSetlist, error: checkError } = await supabase
      .from('setlists')
      .select('id')
      .eq('show_id', showId)
      .maybeSingle();

    if (checkError) {
      console.error("Error checking for existing setlist:", checkError);
      return null;
    }

    // If setlist exists, return its ID
    if (existingSetlist) {
      console.log(`Setlist already exists for show ${showId}: ${existingSetlist.id}`);
      return existingSetlist.id;
    }

    // Get show details for date and venue information
    const { data: show, error: showError } = await supabase
      .from('shows')
      .select('date, venue_id, venues(name, city)')
      .eq('id', showId)
      .single();

    if (showError || !show) {
      console.error("Error getting show details:", showError);
      return null;
    }

    // Create new setlist
    const { data: newSetlist, error: createError } = await supabase
      .from('setlists')
      .insert({
        artist_id: artistId,
        show_id: showId,
        date: show.date,
        venue: (show.venues as any)?.name || null, // Cast to any
        venue_city: (show.venues as any)?.city || null, // Cast to any
      })
      .select()
      .single();

    if (createError) {
      console.error("Error creating setlist:", createError);
      return null;
    }

    console.log(`Created setlist ${newSetlist.id} for show ${showId}`);

    // Get artist's songs from the database
    const { data: songs, error: songsError } = await supabase
      .from('songs')
      .select('id, name, spotify_id, duration_ms, preview_url, popularity')
      .eq('artist_id', artistId)
      .order('popularity', { ascending: false })
      .limit(50);

    if (songsError) {
      console.error("Error fetching songs for setlist:", songsError);
      // Return the setlist ID even if we couldn't fetch songs
      return newSetlist.id;
    }

    // If we don't have songs, we'll still return the setlist ID
    if (!songs || songs.length === 0) {
      console.log("No songs found for artist, setlist created without songs");
      return newSetlist.id;
    }

    // Select 5 random songs from the top 50
    const selectedSongs = songs
      .sort(() => 0.5 - Math.random())
      .slice(0, 5);

    // Prepare played setlist songs data - using the correct table
    const setlistSongs = selectedSongs.map((song, index) => ({
      setlist_id: newSetlist.id,
      song_id: song.id,
      position: index + 1,
      is_encore: false, // Default to not an encore
      created_at: new Date().toISOString()
    }));

    // Insert played setlist songs
    const { error: insertError } = await supabase
      .from('played_setlist_songs') // Using the correct table
      .insert(setlistSongs);

    if (insertError) {
      console.error("Error adding songs to setlist:", insertError);
      // Return the setlist ID even if adding songs failed
      return newSetlist.id;
    }

    console.log(`Added ${setlistSongs.length} songs to setlist ${newSetlist.id}`);
    return newSetlist.id;
  } catch (error) {
    console.error("Error in createOrUpdateSetlist:", error);
    return null;
  }
}

// Removed functions operating on incorrect 'setlist_songs' table
/*
export async function addSongToSetlist(setlistId: string, songData: any) { ... }
*/
/*
export async function updateSetlistSong(songId: string, songData: any) { ... }
*/
/*
export async function removeSongFromSetlist(songId: string) { ... }
*/
/*
export async function updateSongOrder(setlistId: string, songOrder: any[]) { ... }
*/
