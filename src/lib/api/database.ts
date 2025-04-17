import { supabase } from '../db';
import { fetchArtistTopTracks } from '../spotify/api';

/**
 * Fetches an artist's top tracks from Spotify and stores them in the database
 * 
 * @param artistId - The internal database ID of the artist
 * @param spotifyId - The Spotify ID of the artist
 * @param artistName - The name of the artist (for logging)
 * @returns An array of song IDs that were stored
 */
export async function fetchAndStoreArtistTracks(
  artistId: string,
  spotifyId: string,
  artistName: string
): Promise<string[]> {
  try {
    console.log(`Fetching top tracks for artist ${artistName} (${spotifyId})`);
    
    // Fetch artist's top tracks from Spotify
    const topTracks = await fetchArtistTopTracks(spotifyId);
    
    if (!topTracks || topTracks.length === 0) {
      console.log(`No tracks found for artist ${artistName}`);
      return [];
    }
    
    console.log(`Found ${topTracks.length} tracks for artist ${artistName}`);
    
    // Store tracks in database
    const songIds: string[] = [];
    
    for (const track of topTracks) {
      // Check if song already exists
      const { data: existingSong, error: checkError } = await supabase
        .from('songs')
        .select('id')
        .eq('spotify_id', track.id)
        .maybeSingle();
      
      if (checkError) {
        console.error(`Error checking for existing song ${track.name}:`, checkError);
        continue;
      }
      
      // If song exists, update it
      if (existingSong) {
        const { error: updateError } = await supabase
          .from('songs')
          .update({
            name: track.name,
            album_name: track.album?.name,
            album_image_url: track.album?.images?.[0]?.url,
            popularity: track.popularity,
            duration_ms: track.duration_ms,
            preview_url: track.preview_url,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingSong.id);
        
        if (updateError) {
          console.error(`Error updating song ${track.name}:`, updateError);
        } else {
          songIds.push(existingSong.id);
        }
      } else {
        // If song doesn't exist, create it
        const { data: newSong, error: insertError } = await supabase
          .from('songs')
          .insert({
            artist_id: artistId,
            name: track.name,
            album_name: track.album?.name,
            album_image_url: track.album?.images?.[0]?.url,
            spotify_id: track.id,
            popularity: track.popularity,
            duration_ms: track.duration_ms,
            preview_url: track.preview_url,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select('id')
          .single();
        
        if (insertError) {
          console.error(`Error inserting song ${track.name}:`, insertError);
        } else if (newSong) {
          songIds.push(newSong.id);
        }
      }
    }
    
    console.log(`Stored ${songIds.length} songs for artist ${artistName}`);
    return songIds;
  } catch (error) {
    console.error(`Error in fetchAndStoreArtistTracks for ${artistName}:`, error);
    return [];
  }
}

/**
 * Fetches songs for an artist from the database
 * 
 * @param artistId - The internal database ID of the artist
 * @param limit - Maximum number of songs to return
 * @returns An array of songs
 */
export async function getArtistSongs(artistId: string, limit: number = 50) {
  try {
    const { data, error } = await supabase
      .from('songs')
      .select('*')
      .eq('artist_id', artistId)
      .order('popularity', { ascending: false })
      .limit(limit);
    
    if (error) {
      console.error(`Error fetching songs for artist ${artistId}:`, error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error(`Error in getArtistSongs for ${artistId}:`, error);
    return [];
  }
}

/**
 * Gets random songs for an artist
 * 
 * @param artistId - The internal database ID of the artist
 * @param count - Number of random songs to return
 * @returns An array of random songs
 */
export async function getRandomArtistSongs(artistId: string, count: number = 5) {
  try {
    // Try to use the database function for better performance
    try {
      const { data, error } = await supabase
        .rpc('get_random_artist_songs', { 
          artist_uuid: artistId, 
          count: count 
        });
      
      if (!error && data && data.length > 0) {
        return data;
      }
    } catch (rpcError) {
      console.warn('Could not use RPC function, falling back to client-side selection:', rpcError);
    }
    
    // Fallback: get songs and randomize on the client
    const songs = await getArtistSongs(artistId, 50);
    
    if (songs.length === 0) {
      return [];
    }
    
    // Shuffle and take the first `count` songs
    return songs
      .sort(() => 0.5 - Math.random())
      .slice(0, Math.min(count, songs.length));
  } catch (error) {
    console.error(`Error in getRandomArtistSongs for ${artistId}:`, error);
    return [];
  }
}
