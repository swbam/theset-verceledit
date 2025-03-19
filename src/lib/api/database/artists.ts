
import { supabase } from "@/integrations/supabase/client";
import { getArtistAllTracks } from "@/lib/spotify";
import { toast } from "sonner";
import { getStoredTracksForArtist, updateArtistStoredTracks } from "./tracks";

/**
 * Save artist to database
 */
export async function saveArtistToDatabase(artist: any) {
  try {
    if (!artist || !artist.id) {
      console.error("Invalid artist object:", artist);
      return null;
    }
    
    console.log(`Saving artist to database: ${artist.name} (ID: ${artist.id})`);
    
    // Check if artist already exists
    const { data: existingArtist, error: checkError } = await supabase
      .from('artists')
      .select('id, updated_at, stored_tracks, spotify_id, upcoming_shows')
      .eq('id', artist.id)
      .maybeSingle();
    
    if (checkError) {
      console.error("Error checking artist in database:", checkError);
      return null;
    }
    
    // If artist exists and was updated in the last 7 days, only update if we have new data
    if (existingArtist) {
      const lastUpdated = new Date(existingArtist.updated_at || 0);
      const now = new Date();
      const daysSinceUpdate = (now.getTime() - lastUpdated.getTime()) / (1000 * 60 * 60 * 24);
      
      console.log(`Artist ${artist.name} exists, last updated ${daysSinceUpdate.toFixed(1)} days ago`);
      
      // Check if we need to update
      const needsUpdate = 
        daysSinceUpdate > 7 || // More than 7 days old
        !existingArtist.stored_tracks || // No stored tracks
        artist.spotify_id && !existingArtist.spotify_id || // New Spotify ID available
        artist.upcoming_shows && artist.upcoming_shows > (existingArtist.upcoming_shows || 0); // More upcoming shows
      
      if (!needsUpdate) {
        console.log(`No update needed for artist ${artist.name}`);
        return existingArtist;
      }
      
      console.log(`Updating artist ${artist.name} with fresh data`);
    } else {
      console.log(`Artist ${artist.name} is new, creating record`);
    }
    
    // Prepare artist data for upsert
    const artistData = {
      id: artist.id,
      name: artist.name,
      image_url: artist.image || artist.image_url,
      genres: Array.isArray(artist.genres) ? artist.genres : [],
      popularity: artist.popularity || 0,
      upcoming_shows: artist.upcomingShows || artist.upcoming_shows || 0,
      spotify_id: artist.spotify_id || existingArtist?.spotify_id || null,
      stored_tracks: artist.stored_tracks || existingArtist?.stored_tracks || null,
      updated_at: new Date().toISOString()
    };
    
    // Insert or update artist
    const { data, error } = await supabase
      .from('artists')
      .upsert(artistData)
      .select();
    
    if (error) {
      console.error("Error saving artist to database:", error);
      return null;
    }
    
    console.log(`Successfully saved artist ${artist.name} to database`);
    
    // After creating/updating the artist, if they don't have stored tracks, fetch them from Spotify
    if ((!existingArtist?.stored_tracks && !artist.stored_tracks) && artistData.spotify_id) {
      console.log(`No stored tracks found for artist ${artist.id}, fetching from Spotify...`);
      
      try {
        // Fetch tracks in the background (don't await)
        fetchAndStoreArtistTracks(artist.id, artistData.spotify_id, artist.name);
      } catch (trackError) {
        console.error("Error initiating track fetch for artist:", trackError);
      }
    }
    
    return data?.[0] || existingArtist || artist;
  } catch (error) {
    console.error("Error in saveArtistToDatabase:", error);
    return null;
  }
}

/**
 * Fetch and store artist tracks
 */
export async function fetchAndStoreArtistTracks(artistId: string, spotifyId: string, artistName: string) {
  console.log(`Fetching tracks for artist ${artistName} (${spotifyId})`);
  
  try {
    // Check if we already have tracks for this artist
    const existingTracks = await getStoredTracksForArtist(artistId);
    
    if (existingTracks && existingTracks.length > 0) {
      console.log(`Already have ${existingTracks.length} tracks for artist ${artistName}`);
      return existingTracks;
    }
    
    // Fetch tracks from Spotify
    const tracksData = await getArtistAllTracks(spotifyId);
    
    if (!tracksData || !tracksData.tracks || tracksData.tracks.length === 0) {
      console.log(`No tracks found on Spotify for artist ${artistName}`);
      return null;
    }
    
    console.log(`Found ${tracksData.tracks.length} tracks for artist ${artistName}, storing in database`);
    
    // Store tracks in database
    await updateArtistStoredTracks(artistId, tracksData.tracks);
    
    // Update artist record with last update time
    await supabase
      .from('artists')
      .update({ 
        tracks_last_updated: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', artistId);
    
    return tracksData.tracks;
  } catch (error) {
    console.error(`Error fetching and storing tracks for artist ${artistName}:`, error);
    return null;
  }
}

/**
 * Get artist by ID
 */
export async function getArtistById(artistId: string) {
  try {
    const { data, error } = await supabase
      .from('artists')
      .select('*')
      .eq('id', artistId)
      .maybeSingle();
    
    if (error) {
      console.error("Error fetching artist from database:", error);
      return null;
    }
    
    return data;
  } catch (error) {
    console.error("Error in getArtistById:", error);
    return null;
  }
}
