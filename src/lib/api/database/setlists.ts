import { supabase } from "@/integrations/supabase/client";
import { fetchAndStoreSongs, getRandomSongsForArtist } from "./songs";

/**
 * Creates or updates a setlist for a show
 * @param showId The ID of the show
 * @param artistId The ID of the artist
 * @returns The ID of the created or existing setlist
 */
export async function createOrUpdateSetlist(showId: string, artistId: string) {
  try {
    if (!showId || !artistId) {
      console.error("Missing required parameters for createOrUpdateSetlist");
      return null;
    }
    
    // Check if a setlist already exists for this show
    const { data: existingSetlist, error: checkError } = await supabase
      .from('setlists')
      .select('id')
      .eq('show_id', showId)
      .maybeSingle();
    
    if (checkError) {
      console.error(`Error checking for existing setlist: ${checkError.message}`);
      return null;
    }
    
    // If setlist already exists, return its ID
    if (existingSetlist) {
      console.log(`Setlist already exists for show ${showId}: ${existingSetlist.id}`);
      return existingSetlist.id;
    }
    
    // Create a new setlist
    console.log(`Creating new setlist for show ${showId} and artist ${artistId}`);
    const { data: newSetlist, error: createError } = await supabase
      .from('setlists')
      .insert({ 
        show_id: showId,
        artist_id: artistId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (createError) {
      console.error(`Error creating setlist: ${createError.message}`);
      return null;
    }
    
    // Get the artist's Spotify ID 
    const { data: artist, error: artistError } = await supabase
      .from('artists')
      .select('spotify_id, name')
      .eq('id', artistId)
      .maybeSingle();
    
    if (artistError || !artist) {
      console.error(`Error getting artist: ${artistError?.message || 'Artist not found'}`);
      return newSetlist.id; // Still return the setlist ID even if we can't populate it
    }
    
    // If the artist has a Spotify ID, make sure we have their songs
    if (artist.spotify_id) {
      // Fetch and store songs if needed
      await fetchAndStoreSongs(artistId, artist.spotify_id, artist.name);
    }
    
    // Now get a selection of songs for the setlist
    const songs = await getRandomSongsForArtist(artistId, 10);
    
    if (songs.length === 0) {
      console.log(`No songs available for artist ${artistId}, setlist will be empty`);
      return newSetlist.id;
    }
    
    // Add songs to the setlist
    let position = 0;
    for (const song of songs) {
      position++;
      
      const { error: insertError } = await supabase
        .from('setlist_songs')
        .insert({
          setlist_id: newSetlist.id,
          song_id: song.id,
          name: song.name,
          position: position,
          artist_id: artistId,
          vote_count: 0,
          spotify_id: song.spotify_id,
          created_at: new Date().toISOString()
        });
      
      if (insertError) {
        console.error(`Error adding song ${song.name} to setlist: ${insertError.message}`);
      }
    }
    
    console.log(`Successfully created setlist ${newSetlist.id} with ${position} songs`);
    return newSetlist.id;
  } catch (error) {
    console.error(`Error in createOrUpdateSetlist: ${(error as Error).message}`);
    return null;
  }
}

/**
 * Get a setlist by ID with full details
 * @param setlistId The ID of the setlist
 * @returns The setlist with songs and related data
 */
export async function getSetlistById(setlistId: string) {
  try {
    if (!setlistId) {
      console.error("Missing setlist ID for getSetlistById");
      return null;
    }
    
    // Get the setlist with basic related data
    const { data: setlist, error } = await supabase
      .from('setlists')
      .select(`
        id,
        artist_id,
        show_id,
        created_at,
        updated_at,
        show:show_id (
          id,
          name,
          date,
          cover_image
        ),
        artist:artist_id (
          id,
          name,
          image,
          spotify_id
        )
      `)
      .eq('id', setlistId)
      .maybeSingle();
    
    if (error) {
      console.error(`Error fetching setlist: ${error.message}`);
      return null;
    }
    
    if (!setlist) {
      return null;
    }
    
    // Get songs for the setlist
    const songs = await getSetlistSongs(setlistId);
    
    return {
      ...setlist,
      songs
    };
  } catch (error) {
    console.error(`Error in getSetlistById: ${(error as Error).message}`);
    return null;
  }
}

/**
 * Get songs for a setlist, joining with the songs table to get full details
 * @param setlistId The ID of the setlist
 * @returns Array of setlist songs with full details
 */
export async function getSetlistSongs(setlistId: string) {
  try {
    if (!setlistId) {
      console.error("Missing setlist ID for getSetlistSongs");
      return [];
    }
    
    const { data: setlistSongs, error } = await supabase
      .from('setlist_songs')
      .select(`
        id,
        name,
        position,
        vote_count,
        spotify_id,
        song:song_id (
          id,
          name,
          duration_ms,
          popularity,
          preview_url,
          album_name,
          album_image_url
        )
      `)
      .eq('setlist_id', setlistId)
      .order('position', { ascending: true })
      .order('vote_count', { ascending: false });
    
    if (error) {
      console.error(`Error fetching setlist songs: ${error.message}`);
      return [];
    }
    
    return setlistSongs.map(item => ({
      id: item.id,
      name: item.name,
      position: item.position,
      votes: item.vote_count,
      spotify_id: item.spotify_id || item.song?.spotify_id,
      duration_ms: item.song?.duration_ms,
      preview_url: item.song?.preview_url,
      album_name: item.song?.album_name,
      album_image_url: item.song?.album_image_url
    }));
  } catch (error) {
    console.error(`Error in getSetlistSongs: ${(error as Error).message}`);
    return [];
  }
}

/**
 * Get setlist details for a show
 * @param showId The ID of the show
 * @returns Setlist details with songs
 */
export async function getSetlistForShow(showId: string) {
  try {
    if (!showId) {
      console.error("Missing show ID for getSetlistForShow");
      return null;
    }
    
    // Get the setlist for this show
    const { data: setlist, error } = await supabase
      .from('setlists')
      .select(`
        id,
        artist_id,
        created_at,
        updated_at,
        show:show_id (
          id,
          name,
          date
        )
      `)
      .eq('show_id', showId)
      .maybeSingle();
    
    if (error) {
      console.error(`Error fetching setlist: ${error.message}`);
      return null;
    }
    
    if (!setlist) {
      // If no setlist exists, try to create one
      const { data: show, error: showError } = await supabase
        .from('shows')
        .select('id, artist_id')
        .eq('id', showId)
        .maybeSingle();
      
      if (showError || !show) {
        console.error(`Error fetching show: ${showError?.message || 'Show not found'}`);
        return null;
      }
      
      // Create the setlist
      const setlistId = await createOrUpdateSetlist(showId, show.artist_id);
      if (!setlistId) {
        return null;
      }
      
      // Get the newly created setlist
      const { data: newSetlist, error: newError } = await supabase
        .from('setlists')
        .select(`
          id,
          artist_id,
          created_at,
          updated_at,
          show:show_id (
            id,
            name,
            date
          )
        `)
        .eq('id', setlistId)
        .maybeSingle();
      
      if (newError || !newSetlist) {
        console.error(`Error fetching new setlist: ${newError?.message || 'New setlist not found'}`);
        return null;
      }
      
      // Get songs for the new setlist
      const songs = await getSetlistSongs(setlistId);
      
      return {
        ...newSetlist,
        songs
      };
    }
    
    // Get songs for the existing setlist
    const songs = await getSetlistSongs(setlist.id);
    
    return {
      ...setlist,
      songs
    };
  } catch (error) {
    console.error(`Error in getSetlistForShow: ${(error as Error).message}`);
    return null;
  }
}