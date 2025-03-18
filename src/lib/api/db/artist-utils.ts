import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getArtistAllTracks } from "@/lib/spotify/all-tracks";
import { SpotifyTrack } from "@/lib/spotify/types";
import { Json } from "@/integrations/supabase/types";

/**
 * Save artist to database and import their tracks
 */
export async function saveArtistToDatabase(artist: any) {
  try {
    if (!artist || !artist.id) return;
    
    // Check if artist already exists
    const { data: existingArtist, error: checkError } = await supabase
      .from('artists')
      .select('id, updated_at, tracks_last_updated')
      .eq('id', artist.id)
      .maybeSingle();
    
    if (checkError) {
      console.error("Error checking artist in database:", checkError);
      return;
    }
    
    let shouldImportTracks = false;
    
    // If artist exists and was updated in the last 7 days, don't update
    if (existingArtist) {
      const lastUpdated = new Date(existingArtist.updated_at || new Date());
      const now = new Date();
      const daysSinceUpdate = (now.getTime() - lastUpdated.getTime()) / (1000 * 60 * 60 * 24);
      
      // Only update basic info if it's been more than 7 days
      const shouldUpdateInfo = daysSinceUpdate >= 7;
      
      // Check if we need to import tracks
      if (!existingArtist.tracks_last_updated) {
        shouldImportTracks = true;
      } else {
        const lastTracksUpdate = new Date(existingArtist.tracks_last_updated);
        const daysSinceTracksUpdate = (now.getTime() - lastTracksUpdate.getTime()) / (1000 * 60 * 60 * 24);
        shouldImportTracks = daysSinceTracksUpdate >= 7;
      }
      
      if (!shouldUpdateInfo && !shouldImportTracks) {
        return existingArtist;
      }
    } else {
      // New artist, definitely import tracks
      shouldImportTracks = true;
    }
    
    // Insert or update artist
    const { data, error } = await supabase
      .from('artists')
      .upsert({
        id: artist.id,
        name: artist.name,
        image_url: artist.image || artist.image_url,
        genres: Array.isArray(artist.genres) ? artist.genres : [],
        popularity: artist.popularity || 0,
        upcoming_shows: artist.upcomingShows || artist.upcoming_shows || 0,
        updated_at: new Date().toISOString()
      });
    
    if (error) {
      console.error("Error saving artist to database:", error);
      return existingArtist || artist;
    }
    
    // If this is a new artist or tracks need updating, import their catalog
    if (shouldImportTracks) {
      importArtistCatalog(artist.id, artist.spotify_id);
    }
    
    return existingArtist || artist;
  } catch (error) {
    console.error("Error in saveArtistToDatabase:", error);
    return null;
  }
}

/**
 * Import an artist's complete song catalog from Spotify
 */
export async function importArtistCatalog(artistId: string, spotifyId?: string) {
  try {
    console.log(`Importing complete song catalog for artist ${artistId}`);
    
    // Fetch all tracks for the artist
    const { tracks } = await getArtistAllTracks(spotifyId || artistId);
    
    if (!tracks || tracks.length === 0) {
      console.log(`No tracks found for artist ${artistId}`);
      return;
    }
    
    console.log(`Imported ${tracks.length} tracks for artist ${artistId}`);
    
    // Store the tracks in the artist's stored_tracks column and update tracks_last_updated
    // Properly cast tracks to Json type for Supabase
    const { error } = await supabase
      .from('artists')
      .update({ 
        stored_tracks: tracks as unknown as Json,
        updated_at: new Date().toISOString(),
        tracks_last_updated: new Date().toISOString()
      })
      .eq('id', artistId);
      
    if (error) {
      console.error("Error updating artist stored_tracks:", error);
    } else {
      console.log(`Successfully stored ${tracks.length} tracks for artist ${artistId}`);
      
      // Save ALL tracks to artist_songs table instead of just top tracks
      saveTracksToArtistSongsTable(artistId, tracks);
    }
    
  } catch (error) {
    console.error("Error importing artist catalog:", error);
  }
}

/**
 * Save ALL tracks to artist_songs table for permanent storage and faster access
 */
export async function saveTracksToArtistSongsTable(artistId: string, tracks: SpotifyTrack[]) {
  if (!tracks || tracks.length === 0) return;
  
  console.log(`Saving ${tracks.length} tracks to artist_songs table for artist ${artistId}`);
  
  // Determine which tracks are in the top 20 by popularity
  const sortedTracks = [...tracks].sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
  const topTrackIds = new Set(sortedTracks.slice(0, 20).map(track => track.id));
  
  const tracksToInsert = tracks.map(track => ({
    id: track.id,
    artist_id: artistId,
    name: track.name,
    album_id: track.album?.id,
    album_name: track.album?.name,
    album_image_url: track.album?.images?.[0]?.url,
    release_date: track.album?.release_date,
    spotify_url: track.uri,
    preview_url: track.preview_url,
    duration_ms: track.duration_ms,
    popularity: track.popularity,
    explicit: track.explicit || false,
    track_number: track.track_number,
    is_top_track: topTrackIds.has(track.id),
    last_updated: new Date().toISOString()
  }));
  
  // Use batched inserts to handle large catalogs
  const batchSize = 100;
  for (let i = 0; i < tracksToInsert.length; i += batchSize) {
    const batch = tracksToInsert.slice(i, i + batchSize);
    
    // Use upsert to handle duplicates
    const { error } = await supabase
      .from('artist_songs')
      .upsert(batch, { onConflict: 'id,artist_id' });
      
    if (error) {
      console.error(`Error saving batch ${i / batchSize + 1} to artist_songs table:`, error);
    }
  }
  
  console.log(`Successfully saved ${tracks.length} tracks to artist_songs table`);
}

/**
 * Get random songs from an artist's catalog for initial setlist suggestion
 */
export async function getRandomArtistSongs(artistId: string, count: number = 5): Promise<any[]> {
  try {
    // First try to get random songs from our database
    const { data: songs, error } = await supabase
      .from('artist_songs')
      .select('*')
      .eq('artist_id', artistId)
      .order('popularity', { ascending: false })
      .limit(count * 3); // Get more than we need for better randomization
    
    if (error || !songs || songs.length === 0) {
      console.error("Error fetching songs from artist_songs table:", error);
      return [];
    }
    
    // If we have enough songs, return a random selection of them
    if (songs.length >= count) {
      // Shuffle the array and pick the first 'count' items
      const shuffled = songs.sort(() => 0.5 - Math.random());
      return shuffled.slice(0, count);
    }
    
    // If we don't have enough songs, return what we have
    return songs;
  } catch (error) {
    console.error("Error in getRandomArtistSongs:", error);
    return [];
  }
}

/**
 * Legacy function - replaced by saveTracksToArtistSongsTable
 * Keeping for backward compatibility
 */
export async function saveTracksToTopTracksTable(artistId: string, tracks: SpotifyTrack[]) {
  if (!tracks || tracks.length === 0) return;
  
  console.log(`[DEPRECATED] Saving ${tracks.length} tracks to top_tracks table. Using artist_songs table instead.`);
  saveTracksToArtistSongsTable(artistId, tracks);
}

/**
 * Update stored tracks for an artist
 */
export async function updateArtistStoredTracks(artistId: string, tracks: any[]) {
  if (!artistId || !tracks || !Array.isArray(tracks)) {
    console.error("Invalid parameters for updateArtistStoredTracks");
    return;
  }
  
  try {
    const { error } = await supabase
      .from('artists')
      .update({ 
        stored_tracks: tracks as unknown as Json,
        updated_at: new Date().toISOString()
      })
      .eq('id', artistId);
    
    if (error) {
      console.error("Error updating artist stored tracks:", error);
    } else {
      console.log(`Updated stored tracks for artist ${artistId}:`, tracks.length);
      
      // Also update the artist_songs table
      saveTracksToArtistSongsTable(artistId, tracks);
    }
  } catch (error) {
    console.error("Error in updateArtistStoredTracks:", error);
  }
}

/**
 * Syncs artist stats from Spotify to the database
 * This function fetches the latest artist data from Spotify and updates the database record
 */
export async function syncArtistStatsToDatabase(artistId: string, spotifyId?: string): Promise<boolean> {
  try {
    if (!artistId) {
      console.error("Missing artistId in syncArtistStatsToDatabase");
      return false;
    }

    console.log(`Syncing stats for artist ID: ${artistId}, Spotify ID: ${spotifyId || 'unknown'}`);
    
    // First check if the artist exists and has a Spotify ID
    const { data: existingArtist, error: fetchError } = await supabase
      .from('artists')
      .select('id, spotify_id, name, last_synced')
      .eq('id', artistId)
      .maybeSingle();
    
    if (fetchError) {
      console.error("Error fetching artist:", fetchError);
      return false;
    }
    
    // If artist doesn't exist or doesn't have a Spotify ID and none was provided, we can't sync
    if (!existingArtist || (!existingArtist.spotify_id && !spotifyId)) {
      console.warn(`Cannot sync artist stats - no Spotify ID available for artist ID: ${artistId}`);
      return false;
    }
    
    // Use the provided Spotify ID or the one from the database
    const effectiveSpotifyId = spotifyId || existingArtist.spotify_id;
    
    // Check if we should sync based on last_synced timestamp
    const now = new Date();
    if (existingArtist.last_synced) {
      const lastSynced = new Date(existingArtist.last_synced);
      const daysSinceLastSync = Math.floor((now.getTime() - lastSynced.getTime()) / (1000 * 60 * 60 * 24));
      
      // If it's been less than 7 days since the last sync, skip unless force is true
      if (daysSinceLastSync < 7) {
        console.log(`Skipping sync for artist ${existingArtist.name} - last synced ${daysSinceLastSync} days ago`);
        return true; // We consider this a success as it's within our sync window
      }
    }
    
    // Fetch the latest artist data from Spotify
    let spotifyData;
    try {
      // Import the Spotify API function (if needed - may need to adjust based on your actual implementation)
      const { getArtistById } = await import('@/lib/spotify/artist-search');
      spotifyData = await getArtistById(effectiveSpotifyId);
      
      if (!spotifyData) {
        console.error(`No data returned from Spotify for artist ID: ${effectiveSpotifyId}`);
        return false;
      }
    } catch (spotifyError) {
      console.error("Error fetching artist data from Spotify:", spotifyError);
      return false;
    }
    
    // Prepare data for database update
    const updateData = {
      spotify_id: effectiveSpotifyId,
      name: spotifyData.name,
      image_url: spotifyData.images?.[0]?.url,
      popularity: spotifyData.popularity || 0,
      followers: spotifyData.followers?.total || 0,
      genres: spotifyData.genres || [],
      spotify_url: spotifyData.external_urls?.spotify,
      last_synced: now.toISOString(),
      last_updated: now.toISOString()
    };
    
    // Update the artist record in the database
    const { error: updateError } = await supabase
      .from('artists')
      .update(updateData)
      .eq('id', artistId);
    
    if (updateError) {
      console.error("Error updating artist:", updateError);
      return false;
    }
    
    console.log(`Successfully synced stats for artist: ${updateData.name}`);
    return true;
  } catch (error) {
    console.error("Error in syncArtistStatsToDatabase:", error);
    return false;
  }
}

/**
 * Queue artists for weekly stats sync
 * This function marks all artists in the database for syncing
 */
export async function queueArtistsForStatsSync(): Promise<number> {
  try {
    // Get all artists that haven't been synced in the last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const { data: artists, error } = await supabase
      .from('artists')
      .select('id, spotify_id, name')
      .or(`last_synced.is.null,last_synced.lt.${sevenDaysAgo.toISOString()}`);
    
    if (error) {
      console.error("Error fetching artists for sync:", error);
      return 0;
    }
    
    let syncedCount = 0;
    console.log(`Found ${artists.length} artists to sync`);
    
    // Process in batches to avoid overwhelming the API
    const batchSize = 10;
    for (let i = 0; i < artists.length; i += batchSize) {
      const batch = artists.slice(i, i + batchSize);
      
      // Process each artist in the batch
      const syncPromises = batch.map(artist => 
        syncArtistStatsToDatabase(artist.id, artist.spotify_id)
      );
      
      const results = await Promise.allSettled(syncPromises);
      
      // Count successful syncs
      syncedCount += results.filter(r => r.status === 'fulfilled' && r.value === true).length;
      
      // Add a small delay between batches to avoid rate limiting
      if (i + batchSize < artists.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    console.log(`Synced stats for ${syncedCount} artists`);
    return syncedCount;
  } catch (error) {
    console.error("Error in queueArtistsForStatsSync:", error);
    return 0;
  }
}
