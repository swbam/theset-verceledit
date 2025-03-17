
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getArtistAllTracks } from "@/lib/spotify/all-tracks";

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
        image: artist.image,
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
      importArtistTracks(artist.id);
    }
    
    return existingArtist || artist;
  } catch (error) {
    console.error("Error in saveArtistToDatabase:", error);
    return null;
  }
}

/**
 * Import an artist's track catalog from Spotify
 */
export async function importArtistTracks(artistId: string) {
  try {
    console.log(`Importing tracks for artist ${artistId}`);
    
    // Fetch all tracks for the artist
    const { tracks } = await getArtistAllTracks(artistId);
    
    if (!tracks || tracks.length === 0) {
      console.log(`No tracks found for artist ${artistId}`);
      return;
    }
    
    console.log(`Imported ${tracks.length} tracks for artist ${artistId}`);
    
    // Update artist record to note that tracks were imported
    const { error } = await supabase
      .from('artists')
      .update({ 
        updated_at: new Date().toISOString(),
        tracks_last_updated: new Date().toISOString()
      })
      .eq('id', artistId);
      
    if (error) {
      console.error("Error updating artist tracks_last_updated:", error);
    }
    
  } catch (error) {
    console.error("Error importing artist tracks:", error);
  }
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
        stored_tracks: tracks,
        updated_at: new Date().toISOString()
      })
      .eq('id', artistId);
    
    if (error) {
      console.error("Error updating artist stored tracks:", error);
    } else {
      console.log(`Updated stored tracks for artist ${artistId}:`, tracks.length);
    }
  } catch (error) {
    console.error("Error in updateArtistStoredTracks:", error);
  }
}
