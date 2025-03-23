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
    console.log(`Creating new setlist for show ${showId} and artist ${artistId}`);
    const { data: newSetlist, error: createError } = await supabase
      .from('setlists')
      .insert({ 
        show_id: showId,
        artist_id: artistId
      })
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
    
    // Try to get songs from our top_tracks table first (new table)
    const { data: topTracks, error: topTracksError } = await supabase
      .from('top_tracks')
      .select('*')
      .eq('artist_id', artistId)
      .order('popularity', { ascending: false })
      .limit(10);
      
    // Fall back to songs table if no top tracks
    const { data: songs, error: songsError } = topTracks && topTracks.length > 0 ? 
      { data: topTracks, error: null } : 
      await supabase
        .from('songs')
        .select('*')
        .eq('artist_id', artistId)
        .order('popularity', { ascending: false })
        .limit(10);
    
    if (songsError || !songs?.length) {
      console.log(`No stored songs for artist ${artistId}, fetching from Spotify`);
      
      // Import the required function dynamically to avoid circular dependencies
      const { getArtistTopTracks } = await import('../../spotify/top-tracks');
      if (!getArtistTopTracks) {
        console.error('Could not import getArtistTopTracks function');
        return false;
      }
      
      // Fetch top tracks from Spotify
      const spotifyTracks = await getArtistTopTracks(artist.spotify_id);
      if (!spotifyTracks || spotifyTracks.length === 0) {
        console.log(`No tracks found on Spotify for artist ${artistId}`);
        return false;
      }
      
      // Add 5 random tracks from top tracks to the setlist
      const randomTracks = spotifyTracks
        .sort(() => 0.5 - Math.random())
        .slice(0, 5);
      
      // First save tracks to top_tracks table (new table)
      for (const track of randomTracks) {
        // Insert track if it doesn't exist yet
        const { data: trackData, error: trackError } = await supabase
          .from('top_tracks')
          .upsert({
            name: track.name,
            artist_id: artistId,
            spotify_id: track.id,
            duration_ms: track.duration_ms,
            popularity: track.popularity || 0,
            preview_url: track.preview_url,
            album: track.album?.name || '',
            album_image_url: track.album?.images?.[0]?.url || ''
          }, { 
            onConflict: 'spotify_id'
          })
          .select();
          
        // Also insert into songs table for backward compatibility
        const { data: songData, error: songError } = await supabase
          .from('songs')
          .upsert({
            name: track.name,
            artist_id: artistId,
            spotify_id: track.id,
            duration_ms: track.duration_ms,
            popularity: track.popularity || 0,
            preview_url: track.preview_url
          }, { 
            onConflict: 'spotify_id'
          })
          .select();

        if (trackError && songError) {
          console.error(`Error adding track/song: ${trackError?.message || songError?.message}`);
          continue;
        }

        // Prefer track data, fall back to song data
        const track = trackData && trackData.length > 0 ? trackData[0] : null;
        const song = songData && songData.length > 0 ? songData[0] : null;
        const item = track || song;
        if (!item) continue;

        // Then add to setlist_songs
        const { error: setlistSongError } = await supabase
          .from('setlist_songs')
          .insert({
            setlist_id: setlistId,
            song_id: item.id,
            name: item.name,
            artist_id: artistId,
            vote_count: 0
          });
          
        if (setlistSongError) {
          console.error(`Error adding setlist song: ${setlistSongError.message}`);
        }
      }
    } else {
      // Use songs from database
      const randomSongs = songs
        .sort(() => 0.5 - Math.random())
        .slice(0, 5);
      
      for (const song of randomSongs) {
        // Use type assertion to ensure we have the required properties
        const songData = song as { id: string; name: string };
        
        const { error: setlistSongError } = await supabase
          .from('setlist_songs')
          .insert({
            setlist_id: setlistId,
            song_id: songData.id,
            name: songData.name,
            artist_id: artistId,
            vote_count: 0
          });
          
        if (setlistSongError) {
          console.error(`Error adding setlist song: ${setlistSongError.message}`);
        }
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
    const { data: setlistSongs, error: songsError } = await supabase
      .from('setlist_songs')
      .select(`
        id,
        name,
        vote_count,
        song:song_id (
          id,
          spotify_id,
          duration_ms,
          preview_url
        )
      `)
      .eq('setlist_id', setlist.id)
      .order('vote_count', { ascending: false });
    
    if (songsError) {
      console.error("Error fetching setlist songs:", songsError);
      return [];
    }
    
    // Format songs for the frontend
    return setlistSongs.map(song => ({
      id: song.id,
      name: song.name,
      votes: song.vote_count,
      spotify_id: song.song?.spotify_id,
      duration_ms: song.song?.duration_ms,
      preview_url: song.song?.preview_url,
      hasVoted: false // This will be determined client-side
    }));
  } catch (error) {
    console.error("Error getting setlist songs:", error);
    return [];
  }
}