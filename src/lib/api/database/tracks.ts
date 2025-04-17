
import { Song } from '@/lib/types';
import { supabase } from "@/integrations/supabase/client";

/**
 * Save tracks to database for an artist
 */
export async function updateArtistStoredTracks(artistId: string, tracks: any[]) {
  if (!artistId || !tracks || !Array.isArray(tracks)) {
    console.error("Invalid parameters for updateArtistStoredTracks");
    return;
  }
  
  try {
    console.log(`Updating stored tracks for artist ${artistId}: ${tracks.length} tracks`);
    const { error } = await supabase
      .from('artists')
      .update({ 
        stored_tracks: tracks,
        tracks_last_updated: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', artistId);
    
    if (error) {
      console.error("Error updating artist stored tracks:", error);
    } else {
      console.log(`Updated stored tracks for artist ${artistId}: ${tracks.length} tracks successfully stored`);
    }
  } catch (error) {
    console.error("Error in updateArtistStoredTracks:", error);
  }
}

/**
 * Fetch stored tracks for an artist
 */
export async function getStoredTracksForArtist(artistId: string): Promise<Song[] | null> {
  try {
    if (!artistId) {
      console.error("Missing artist ID for getStoredTracksForArtist");
      return null;
    }
    console.log(`Fetching stored tracks (songs) for artist ${artistId}`);

    // Query the 'songs' table instead of 'artists'
    const { data: songs, error } = await supabase
      .from('songs')
      .select(`
        id,
        name,
        spotify_id,
        duration_ms,
        popularity,
        preview_url,
        vote_count,
        created_at,
        updated_at,
        artist_id,
        album_name,
        album_image_url
      `) // Select all relevant song fields
      .eq('artist_id', artistId); // Filter by artist_id

    if (error) {
      console.error(`Error fetching songs for artist ${artistId}:`, error);
      return null;
    }

    if (songs && songs.length > 0) {
      console.log(`Found ${songs.length} songs for artist ${artistId}`);
      // TODO: Add logic to check freshness if needed (e.g., based on song updated_at or a separate sync status table)
      return songs as Song[]; // Cast to Song[] type
    }

    console.log(`No songs found for artist ${artistId}`);
    return []; // Return empty array if no songs found, consistent with previous logic
  } catch (error) {
    console.error("Error in getStoredTracksForArtist:", error);
    return null;
  }
}
