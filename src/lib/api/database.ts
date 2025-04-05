// Use adminClient for elevated privileges needed for these operations
import { adminClient } from '@/lib/db';
import { SpotifyTrack } from "../spotify/types";
/**
 * Get stored tracks for an artist from the database
 */
export async function getStoredTracksForArtist(artistId: string) {
  try {
    const { data, error } = await adminClient() // Use adminClient
      .from('songs')
      .select('id, name, spotify_id, duration_ms, preview_url, popularity')
      .eq('artist_id', artistId)
      .order('popularity', { ascending: false });
      
    if (error) {
      console.error("Error fetching tracks for artist:", error);
      return null;
    }
    
    return data;
  } catch (error) {
    console.error("Error in getStoredTracksForArtist:", error);
    return null;
  }
}

/**
 * Update artist stored tracks
 */
export async function updateArtistStoredTracks(
  artistId: string, 
  tracks: SpotifyTrack[]
) {
  try {
    if (!tracks || tracks.length === 0) return false;
    
    // Store tracks in the database
    await storeSongsInDatabase(artistId, tracks);
    
    return true;
  } catch (error) {
    console.error("Error in updateArtistStoredTracks:", error);
    return false;
  }
}

/**
 * Fetch and store artist tracks from Spotify
 */
export async function fetchAndStoreArtistTracks(
  artistId: string,
  spotifyId: string,
  artistName: string
) {
  try {
    console.log(`Fetching tracks for artist ${artistName} (${spotifyId})`);
    
    // Dynamically import to avoid circular dependencies
    const { getArtistAllTracks } = await import('../spotify/all-tracks');
    
    // Get tracks from Spotify
    const tracks = await getArtistAllTracks(spotifyId);
    
    if (!tracks || !tracks.tracks || tracks.tracks.length === 0) {
      console.log(`No tracks found for artist ${artistName}`);
      return false;
    }
    
    console.log(`Got ${tracks.tracks.length} tracks for artist ${artistName}`);
    
    // Store tracks in the songs table
    await storeSongsInDatabase(artistId, tracks.tracks);
    
    return true;
  } catch (error) {
    console.error(`Error fetching tracks for artist ${artistName}:`, error);
    return false;
  }
}

/**
 * Store artist songs in the database
 */
async function storeSongsInDatabase(artistId: string, tracks: SpotifyTrack[]) {
  if (!tracks || tracks.length === 0) return;
  
  try {
    console.log(`Storing ${tracks.length} songs for artist ${artistId}`);
    
    // Process tracks in batches to avoid excessive database operations
    const batchSize = 50;
    
    for (let i = 0; i < tracks.length; i += batchSize) {
      const batch = tracks.slice(i, i + batchSize);
      
      // Prepare songs data
      const songs = batch.map(track => ({
        name: track.name,
        artist_id: artistId,
        spotify_id: track.id,
        duration_ms: track.duration_ms,
        popularity: track.popularity || 0,
        preview_url: track.preview_url || null,
        updated_at: new Date().toISOString()
      }));
      
      // Insert songs using upsert to handle duplicates
      const { error } = await adminClient() // Use adminClient
        .from('songs')
        .upsert(songs, {
          onConflict: 'spotify_id', // Ensure this matches your actual unique constraint for songs
          ignoreDuplicates: false // Update existing conflicting rows
        });
      
      if (error) {
        console.error(`[storeSongsInDatabase] Error storing songs batch for artist ${artistId}:`, error);
        // Throw error to signal failure
        throw new Error(`Failed to store song batch for artist ${artistId}. Code: ${error.code}, Message: ${error.message}`);
      }
    }
    
    console.log(`Successfully stored songs for artist ${artistId}`);
    return true;
  } catch (error) {
    console.error("Error in storeSongsInDatabase:", error);
    return false;
  }
}

// Removed redundant functions: createSetlistForShow, populateSetlistWithSongs, addSongsToSetlist
// Equivalent logic exists in src/lib/api/database-utils.ts (createSetlistDirectly, populateSetlistSongs, addSongsToSetlistInternal)
// and is called from saveShowToDatabase.
