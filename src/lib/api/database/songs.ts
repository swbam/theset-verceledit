import { supabase } from "@/integrations/supabase/client";

/**
 * Fetch songs for an artist from Spotify and store them in our database
 * @param artistId The internal artist ID
 * @param spotifyId The Spotify artist ID
 * @param artistName The name of the artist
 */
export async function fetchAndStoreSongs(artistId: string, spotifyId: string, artistName: string) {
  try {
    if (!artistId || !spotifyId) {
      console.error("Missing required parameters for fetchAndStoreSongs");
      return false;
    }
    
    // Check if we already have songs for this artist
    const { count, error: countError } = await supabase
      .from('songs')
      .select('*', { count: 'exact', head: true })
      .eq('artist_id', artistId);
    
    if (countError) {
      console.error(`Error checking song count: ${countError.message}`);
      return false;
    }
    
    // If we have enough songs, don't fetch more
    if (count && count > 10) {
      console.log(`Artist ${artistName} already has ${count} songs in database`);
      return true;
    }
    
    // Import the required function dynamically
    try {
      const { getArtistTopTracks } = await import('../../spotify/top-tracks');
      
      // Fetch top tracks from Spotify
      console.log(`Fetching top tracks for ${artistName} (${spotifyId})`);
      const spotifyTracks = await getArtistTopTracks(spotifyId);
      
      // Check the 'tracks' property of the response object
      if (!spotifyTracks || !spotifyTracks.tracks || spotifyTracks.tracks.length === 0) {
        console.log(`No tracks found on Spotify for artist ${artistName}`);
        return false;
      }
      
      console.log(`Found ${spotifyTracks.tracks.length} tracks for ${artistName}`);
      
      // Save tracks to database
      let savedCount = 0;
      for (const track of spotifyTracks.tracks) {
        if (!track.id) continue;
        
        // Add to songs table - use upsert to avoid duplicates
        const { error: songError } = await supabase
          .from('songs')
          .upsert({
            name: track.name,
            artist_id: artistId,
            spotify_id: track.id,
            duration_ms: track.duration_ms,
            popularity: track.popularity || 0,
            preview_url: track.preview_url,
            album_name: track.album?.name,
            album_image_url: track.album?.images?.[0]?.url,
            created_at: new Date().toISOString()
          }, { 
            onConflict: 'spotify_id'
          });
          
        if (songError) {
          console.error(`Error adding song ${track.name}: ${songError.message}`);
          continue;
        }
        
        savedCount++;
      }
      
      console.log(`Added/updated ${savedCount} songs for ${artistName}`);
      return savedCount > 0;
      
    } catch (importError) {
      console.error("Error importing Spotify functions:", importError);
      return false;
    }
  } catch (error) {
    console.error(`Error in fetchAndStoreSongs: ${(error as Error).message}`);
    return false;
  }
}

/**
 * Get a random selection of songs for an artist
 * @param artistId The artist ID
 * @param limit The maximum number of songs to return (default 10)
 * @returns Array of songs
 */
export async function getRandomSongsForArtist(artistId: string, limit = 10) {
  try {
    if (!artistId) {
      console.error("Missing artist ID for getRandomSongsForArtist");
      return [];
    }
    
    // Get songs from database
    const { data: songs, error } = await supabase
      .from('songs')
      .select('*')
      .eq('artist_id', artistId);
    
    if (error) {
      console.error(`Error getting songs: ${error.message}`);
      return [];
    }
    
    if (!songs || songs.length === 0) {
      console.log(`No songs found for artist ${artistId}`);
      return [];
    }
    
    // Randomize and limit
    return songs
      .sort(() => 0.5 - Math.random())
      .slice(0, limit);
    
  } catch (error) {
    console.error(`Error in getRandomSongsForArtist: ${(error as Error).message}`);
    return [];
  }
} 