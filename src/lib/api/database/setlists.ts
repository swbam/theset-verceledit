import { supabase } from "@/integrations/supabase/client";
import { v4 as uuidv4 } from 'uuid';

/**
 * Creates a setlist for a show if one doesn't already exist
 * Populates the setlist with random songs from the artist's catalog
 */
export async function createSetlistForShow(showId: string, artistId: string) {
  try {
    const setlistId = await ensureSetlistExists(showId, artistId);
    return setlistId;
  } catch (error) {
    console.error("Error creating setlist for show:", error);
    return null;
  }
}

/**
 * Ensure a setlist exists for a show, creating one if needed
 */
export async function ensureSetlistExists(showId: string, artistId: string) {
  try {
    // Check if this show already has a setlist
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
    console.log(`Creating new setlist for show ${showId}`);
    const { data: newSetlist, error: createError } = await supabase
      .from('setlists')
      .insert({ show_id: showId })
      .select()
      .single();
    
    if (createError) {
      console.error(`Error creating setlist: ${createError.message}`);
      return null;
    }
    
    // Now populate the setlist with songs from the artist's catalog
    await populateSetlistWithSongs(newSetlist.id, artistId);
    
    return newSetlist.id;
  } catch (error) {
    console.error(`Error ensuring setlist exists: ${(error as Error).message}`);
    return null;
  }
}

/**
 * Populate a setlist with songs from the artist's catalog
 */
async function populateSetlistWithSongs(setlistId: string, artistId: string) {
  try {
    // Get the artist's Spotify ID
    const { data: artist, error: artistError } = await supabase
      .from('artists')
      .select('spotify_id')
      .eq('id', artistId)
      .maybeSingle();
    
    if (artistError || !artist?.spotify_id) {
      console.log(`Can't get Spotify ID for artist ${artistId}: ${artistError?.message || 'No Spotify ID'}`);
      return false;
    }
    
    // Try to get tracks from our database first
    const { data: tracks, error: tracksError } = await supabase
      .from('artist_tracks')
      .select('*')
      .eq('artist_id', artistId)
      .order('popularity', { ascending: false })
      .limit(10);
    
    if (tracksError || !tracks?.length) {
      console.log(`No stored tracks for artist ${artistId}, fetching from Spotify`);
      
      // Import the required function dynamically to avoid circular dependencies
      const { getArtistTopTracks } = await import('../../spotify/top-tracks');
      if (!getArtistTopTracks) {
        console.error('Could not import getArtistTopTracks function');
        return false;
      }
      
      // Fetch top tracks from Spotify
      const spotifyTracks = await getArtistTopTracks(artist.spotify_id);
      if (!spotifyTracks?.length) {
        console.log(`No tracks found on Spotify for artist ${artistId}`);
        return false;
      }
      
      // Add 5 random tracks from top tracks to the setlist
      const randomTracks = spotifyTracks
        .sort(() => 0.5 - Math.random())
        .slice(0, 5);
      
      for (const track of randomTracks) {
        await supabase.from('setlist_songs').insert({
          setlist_id: setlistId,
          spotify_id: track.id,
          title: track.name,
          duration_ms: track.duration_ms,
          preview_url: track.preview_url,
          album_name: track.album?.name,
          album_image_url: track.album?.images?.[0]?.url,
          votes: 0
        });
      }
    } else {
      // Use tracks from database
      const randomTracks = tracks
        .sort(() => 0.5 - Math.random())
        .slice(0, 5);
      
      for (const track of randomTracks) {
        await supabase.from('setlist_songs').insert({
          setlist_id: setlistId,
          spotify_id: track.spotify_id,
          title: track.name,
          duration_ms: track.duration_ms,
          preview_url: track.preview_url,
          album_name: track.album_name,
          album_image_url: track.album_image_url,
          votes: 0
        });
      }
    }
    
    console.log(`Successfully populated setlist ${setlistId} with songs`);
    return true;
  } catch (error) {
    console.error(`Error populating setlist: ${(error as Error).message}`);
    return false;
  }
}

/**
 * Get setlist songs for a show
 */
export async function getSetlistSongs(showId: string) {
  try {
    // First get the setlist ID
    const { data: setlist, error: setlistError } = await supabase
      .from('setlists')
      .select('id')
      .eq('show_id', showId)
      .maybeSingle();
    
    if (setlistError) {
      console.error("Error fetching setlist:", setlistError);
      return [];
    }
    
    if (!setlist) {
      console.log(`No setlist found for show: ${showId}`);
      return [];
    }
    
    // Get the songs for this setlist
    const { data: songs, error: songsError } = await supabase
      .from('setlist_songs')
      .select('id, title, votes, spotify_id, duration_ms, preview_url, album_name, album_image_url')
      .eq('setlist_id', setlist.id)
      .order('votes', { ascending: false });
    
    if (songsError) {
      console.error("Error fetching setlist songs:", songsError);
      return [];
    }
    
    // Format songs for the frontend
    return songs.map(song => ({
      id: song.id,
      title: song.title,
      votes: song.votes,
      spotify_id: song.spotify_id,
      duration_ms: song.duration_ms,
      preview_url: song.preview_url,
      album_name: song.album_name,
      album_image_url: song.album_image_url,
      hasVoted: false // This will be determined client-side
    }));
  } catch (error) {
    console.error("Error getting setlist songs:", error);
    return [];
  }
} 