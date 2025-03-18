import { supabase } from "@/integrations/supabase/client";
import { SpotifyTrack } from './types';

// Function to save tracks to db
export async function saveTracksToDb(artistId: string, tracks: SpotifyTrack[]) {
  try {
    if (!artistId || !tracks || tracks.length === 0) {
      console.warn("Invalid input for saveTracksToDb. Skipping save.");
      return;
    }
    
    console.log(`Saving ${tracks.length} tracks to database for artist ${artistId}`);
    
    // Prepare tracks for insertion
    const tracksToInsert = tracks.map(track => ({
      artist_id: artistId,
      id: track.id,
      name: track.name,
      spotify_url: track.uri,
      preview_url: track.preview_url,
      album_name: track.album?.name,
      album_image_url: track.album?.images?.[0]?.url,
      popularity: track.popularity || 0,
      duration_ms: track.duration_ms,
      last_updated: new Date().toISOString()
    }));
    
    // Use upsert to either insert new tracks or update existing ones
    const { error } = await supabase
      .from('top_tracks')
      .upsert(tracksToInsert, { onConflict: 'id' });
    
    if (error) {
      console.error("Error saving tracks to database:", error);
    } else {
      console.log(`Successfully saved ${tracks.length} tracks to database for artist ${artistId}`);
    }
  } catch (error) {
    console.error("Error in saveTracksToDb:", error);
  }
}

// Function to retrieve top tracks from db
export async function getArtistTopTracksFromDb(artistId: string, limit = 10): Promise<SpotifyTrack[]> {
  try {
    if (!artistId) return [];
    
    console.log(`Retrieving top ${limit} tracks for artist ${artistId} from database`);
    
    const { data, error } = await supabase
      .from('top_tracks')
      .select('*')
      .eq('artist_id', artistId)
      .order('popularity', { ascending: false })
      .limit(limit);
    
    if (error) {
      console.error("Error retrieving top tracks from database:", error);
      return [];
    }
    
    if (!data || data.length === 0) {
      console.log(`No top tracks found in database for artist ${artistId}`);
      return [];
    }
    
    console.log(`Retrieved ${data.length} top tracks for artist ${artistId} from database`);
    
    return convertStoredTracks(data);
  } catch (error) {
    console.error("Error in getArtistTopTracksFromDb:", error);
    return [];
  }
}

// Function to retrieve all tracks from db
export async function getStoredTracksFromDb(artistId: string): Promise<SpotifyTrack[]> {
  try {
    if (!artistId) return [];
    
    console.log(`Retrieving all tracks for artist ${artistId} from database`);
    
    const { data, error } = await supabase
      .from('top_tracks')
      .select('*')
      .eq('artist_id', artistId)
      .limit(100); // Increased limit to ensure we have a good selection
    
    if (error) {
      console.error("Error retrieving all tracks from database:", error);
      return [];
    }
    
    if (!data || data.length === 0) {
      console.log(`No tracks found in database for artist ${artistId}`);
      return [];
    }
    
    console.log(`Retrieved ${data.length} tracks for artist ${artistId} from database`);
    
    return convertStoredTracks(data);
  } catch (error) {
    console.error("Error in getStoredTracksFromDb:", error);
    return [];
  }
}

// Function to check if artist tracks need to be updated
export async function checkArtistTracksNeedUpdate(artistId: string): Promise<boolean> {
  try {
    if (!artistId) return false;
    
    // Check when the artist's tracks were last updated
    const { data, error } = await supabase
      .from('artists')
      .select('tracks_last_updated')
      .eq('id', artistId)
      .single();
    
    if (error) {
      console.error("Error checking last updated time for artist:", error);
      return false;
    }
    
    if (!data || !data.tracks_last_updated) {
      console.log("No last updated time found for artist, tracks need update");
      return true;
    }
    
    // If tracks were updated more than 30 days ago, update them
    const lastUpdated = new Date(data.tracks_last_updated);
    const now = new Date();
    const diffInDays = (now.getTime() - lastUpdated.getTime()) / (1000 * 3600 * 24);
    
    if (diffInDays > 30) {
      console.log("Tracks were last updated more than 30 days ago, tracks need update");
      return true;
    }
    
    console.log("Tracks are up to date, no need to update");
    return false;
  } catch (error) {
    console.error("Error in checkArtistTracksNeedUpdate:", error);
    return false;
  }
}

// Function to convert stored tracks to SpotifyTrack format
export function convertStoredTracks(tracks: any[]): SpotifyTrack[] {
  return tracks.map(track => ({
    id: track.id,
    name: track.name,
    album: {
      name: track.album_name,
      images: track.album_image_url ? [{ url: track.album_image_url }] : []
    },
    artists: [{ name: 'Unknown' }],
    uri: track.spotify_url,
    duration_ms: track.duration_ms,
    popularity: track.popularity,
    preview_url: track.preview_url
  }));
}
