
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getArtistAllTracks } from "@/lib/spotify";
import { updateArtistStoredTracks } from "./database-utils";

/**
 * Save artist to database
 */
export async function saveArtistToDatabase(artist: any) {
  try {
    if (!artist || !artist.id) return;
    
    // Check if artist already exists
    const { data: existingArtist, error: checkError } = await supabase
      .from('artists')
      .select('id, updated_at, stored_tracks, spotify_id')
      .eq('id', artist.id)
      .maybeSingle();
    
    if (checkError) {
      console.error("Error checking artist in database:", checkError);
      return;
    }
    
    // If artist exists and was updated in the last 7 days, don't update unless stored_tracks is null
    if (existingArtist) {
      const lastUpdated = new Date(existingArtist.updated_at);
      const now = new Date();
      const daysSinceUpdate = (now.getTime() - lastUpdated.getTime()) / (1000 * 60 * 60 * 24);
      
      // Only update if it's been more than 7 days or if stored_tracks is null and we have new tracks to store
      if (daysSinceUpdate < 7 && (existingArtist.stored_tracks || !artist.stored_tracks)) {
        return existingArtist;
      }
    }
    
    // Insert or update artist
    const { data, error } = await supabase
      .from('artists')
      .upsert({
        id: artist.id,
        name: artist.name,
        image_url: artist.image,
        genres: Array.isArray(artist.genres) ? artist.genres : [],
        popularity: artist.popularity || 0,
        upcoming_shows: artist.upcomingShows || artist.upcoming_shows || 0,
        stored_tracks: artist.stored_tracks || null,
        updated_at: new Date().toISOString()
      });
    
    if (error) {
      console.error("Error saving artist to database:", error);
    }

    // After creating/updating the artist, if they don't have stored tracks, fetch them from Spotify
    if (!existingArtist?.stored_tracks && !artist.stored_tracks) {
      console.log(`No stored tracks found for artist ${artist.id}, fetching from Spotify...`);
      
      // Use the spotify_id if available, otherwise attempt to fetch by name
      const spotifyId = existingArtist?.spotify_id || artist.spotify_id;
      
      if (spotifyId) {
        try {
          // Fetch all tracks for this artist from Spotify
          const tracksData = await getArtistAllTracks(spotifyId);
          
          if (tracksData && tracksData.tracks && tracksData.tracks.length > 0) {
            console.log(`Found ${tracksData.tracks.length} tracks for artist ${artist.id}, storing in database`);
            
            // Update the artist with the fetched tracks
            await updateArtistStoredTracks(artist.id, tracksData.tracks);
          }
        } catch (trackError) {
          console.error("Error fetching tracks for artist:", trackError);
        }
      }
    }
    
    return existingArtist || artist;
  } catch (error) {
    console.error("Error in saveArtistToDatabase:", error);
    return null;
  }
}

/**
 * Save venue to database
 */
export async function saveVenueToDatabase(venue: any) {
  try {
    if (!venue || !venue.id) return;
    
    // Check if venue already exists
    const { data: existingVenue, error: checkError } = await supabase
      .from('venues')
      .select('id, updated_at')
      .eq('id', venue.id)
      .maybeSingle();
    
    if (checkError) {
      console.error("Error checking venue in database:", checkError);
      return;
    }
    
    // If venue exists and was updated recently, don't update
    if (existingVenue) {
      const lastUpdated = new Date(existingVenue.updated_at);
      const now = new Date();
      const daysSinceUpdate = (now.getTime() - lastUpdated.getTime()) / (1000 * 60 * 60 * 24);
      
      // Only update if it's been more than 30 days (venues change rarely)
      if (daysSinceUpdate < 30) {
        return existingVenue;
      }
    }
    
    // Insert or update venue
    const { data, error } = await supabase
      .from('venues')
      .upsert({
        id: venue.id,
        name: venue.name,
        city: venue.city,
        state: venue.state,
        country: venue.country,
        address: venue.address,
        postal_code: venue.postal_code,
        location: venue.location,
        updated_at: new Date().toISOString()
      });
    
    if (error) {
      console.error("Error saving venue to database:", error);
    }
    
    return existingVenue || venue;
  } catch (error) {
    console.error("Error in saveVenueToDatabase:", error);
    return null;
  }
}

/**
 * Save show to database
 */
export async function saveShowToDatabase(show: any) {
  try {
    if (!show || !show.id) return;
    
    // Check if show already exists
    const { data: existingShow, error: checkError } = await supabase
      .from('shows')
      .select('id, updated_at')
      .eq('id', show.id)
      .maybeSingle();
    
    if (checkError) {
      console.error("Error checking show in database:", checkError);
      return;
    }
    
    // If show exists and was updated recently, don't update
    if (existingShow) {
      const lastUpdated = new Date(existingShow.updated_at);
      const now = new Date();
      const hoursSinceUpdate = (now.getTime() - lastUpdated.getTime()) / (1000 * 60 * 60);
      
      // Only update if it's been more than 24 hours
      if (hoursSinceUpdate < 24) {
        return existingShow;
      }
    }
    
    // Insert or update show
    const { data, error } = await supabase
      .from('shows')
      .upsert({
        id: show.id,
        name: show.name,
        date: show.date,
        artist_id: show.artist_id,
        venue_id: show.venue_id,
        ticket_url: show.ticket_url,
        image_url: show.image_url,
        genre_ids: show.genre_ids || [],
        popularity: show.popularity || 0,
        updated_at: new Date().toISOString()
      });
    
    if (error) {
      console.error("Error saving show to database:", error);
    }
    
    return existingShow || show;
  } catch (error) {
    console.error("Error in saveShowToDatabase:", error);
    return null;
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

/**
 * Fetch stored tracks for an artist
 */
export async function getStoredTracksForArtist(artistId: string) {
  try {
    const { data: artist, error } = await supabase
      .from('artists')
      .select('stored_tracks')
      .eq('id', artistId)
      .maybeSingle();
    
    if (error) {
      console.error("Error fetching stored tracks for artist:", error);
      return null;
    }
    
    if (artist && artist.stored_tracks && Array.isArray(artist.stored_tracks)) {
      console.log(`Found ${artist.stored_tracks.length} stored tracks for artist ${artistId}`);
      return artist.stored_tracks;
    }
    
    return null;
  } catch (error) {
    console.error("Error in getStoredTracksForArtist:", error);
    return null;
  }
}
