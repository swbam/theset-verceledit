
import { supabase } from "@/integrations/supabase/client";
import { saveVenueToDatabase } from "./venues";
import { saveArtistToDatabase, fetchAndStoreArtistTracks } from "./artists";

/**
 * Save show to database
 */
export async function saveShowToDatabase(show: any) {
  try {
    if (!show || !show.id) {
      console.error("Invalid show object:", show);
      return null;
    }
    
    console.log(`Processing show: ${show.name} (ID: ${show.id})`);
    
    // Check if show already exists
    const { data: existingShow, error: checkError } = await supabase
      .from('shows')
      .select('id, updated_at, artist_id, venue_id')
      .eq('id', show.id)
      .maybeSingle();
    
    if (checkError) {
      console.error("Error checking show in database:", checkError);
      return null;
    }
    
    // If show exists and was updated recently, don't update
    if (existingShow) {
      const lastUpdated = new Date(existingShow.updated_at);
      const now = new Date();
      const hoursSinceUpdate = (now.getTime() - lastUpdated.getTime()) / (1000 * 60 * 60);
      
      // Only update if it's been more than 24 hours
      if (hoursSinceUpdate < 24) {
        console.log(`Show ${show.name} was updated ${hoursSinceUpdate.toFixed(1)} hours ago, skipping update`);
        return existingShow;
      }
      
      console.log(`Show ${show.name} needs update (last updated ${hoursSinceUpdate.toFixed(1)} hours ago)`);
    } else {
      console.log(`Show ${show.name} is new, creating in database`);
    }
    
    // Ensure venue is saved first if provided
    let venueId = show.venue_id;
    if (show.venue && !venueId) {
      const savedVenue = await saveVenueToDatabase(show.venue);
      if (savedVenue) {
        venueId = savedVenue.id;
      }
    }
    
    // Ensure artist is saved if provided
    let artistId = show.artist_id;
    if (show.artist && !artistId) {
      const savedArtist = await saveArtistToDatabase(show.artist);
      if (savedArtist) {
        artistId = savedArtist.id;
        
        // If artist has Spotify ID but no tracks, fetch them in background
        if (savedArtist.spotify_id && !savedArtist.stored_tracks) {
          fetchAndStoreArtistTracks(savedArtist.id, savedArtist.spotify_id, savedArtist.name)
            .catch(err => console.error(`Background track fetch error:`, err));
        }
      }
    }
    
    // Insert or update show
    const { data, error } = await supabase
      .from('shows')
      .upsert({
        id: show.id,
        name: show.name,
        date: show.date,
        artist_id: artistId || show.artist_id,
        venue_id: venueId || show.venue_id,
        ticket_url: show.ticket_url,
        image_url: show.image_url,
        genre_ids: show.genre_ids || [],
        popularity: show.popularity || 0,
        updated_at: new Date().toISOString()
      })
      .select();
    
    if (error) {
      console.error("Error saving show to database:", error);
      return null;
    }
    
    console.log(`Successfully saved show ${show.name} to database`);
    
    // Update the artist's upcoming_shows count
    if (artistId || show.artist_id) {
      updateArtistShowCount(artistId || show.artist_id);
    }
    
    return data?.[0] || existingShow || show;
  } catch (error) {
    console.error("Error in saveShowToDatabase:", error);
    return null;
  }
}

/**
 * Update artist's upcoming show count
 */
async function updateArtistShowCount(artistId: string) {
  try {
    // Count upcoming shows for this artist
    const { count, error } = await supabase
      .from('shows')
      .select('id', { count: 'exact', head: true })
      .eq('artist_id', artistId)
      .gte('date', new Date().toISOString());
    
    if (error) {
      console.error("Error counting shows for artist:", error);
      return;
    }
    
    if (count !== null) {
      // Update artist record with show count
      await supabase
        .from('artists')
        .update({ 
          upcoming_shows: count,
          updated_at: new Date().toISOString()
        })
        .eq('id', artistId);
        
      console.log(`Updated show count for artist ${artistId}: ${count} upcoming shows`);
    }
  } catch (error) {
    console.error("Error updating artist show count:", error);
  }
}

/**
 * Get shows for an artist
 */
export async function getShowsForArtist(artistId: string) {
  try {
    const { data, error } = await supabase
      .from('shows')
      .select(`
        id, 
        name, 
        date, 
        artist_id,
        venue_id,
        ticket_url,
        image_url,
        venues:venue_id (
          id,
          name,
          city,
          state,
          country
        )
      `)
      .eq('artist_id', artistId)
      .gte('date', new Date().toISOString())
      .order('date', { ascending: true });
    
    if (error) {
      console.error("Error fetching shows for artist:", error);
      return [];
    }
    
    return data.map(show => ({
      ...show,
      venue: show.venues
    }));
  } catch (error) {
    console.error("Error in getShowsForArtist:", error);
    return [];
  }
}
