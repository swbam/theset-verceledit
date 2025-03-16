
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * Save artist to database
 */
export async function saveArtistToDatabase(artist: any) {
  try {
    if (!artist || !artist.id) return;
    
    // Check if artist already exists
    const { data: existingArtist, error: checkError } = await supabase
      .from('artists')
      .select('id, updated_at')
      .eq('id', artist.id)
      .maybeSingle();
    
    if (checkError) {
      console.error("Error checking artist in database:", checkError);
      return;
    }
    
    // If artist exists and was updated in the last 7 days, don't update
    if (existingArtist) {
      const lastUpdated = new Date(existingArtist.updated_at);
      const now = new Date();
      const daysSinceUpdate = (now.getTime() - lastUpdated.getTime()) / (1000 * 60 * 60 * 24);
      
      if (daysSinceUpdate < 7) {
        return;
      }
    }
    
    // Insert or update artist
    const { error } = await supabase
      .from('artists')
      .upsert({
        id: artist.id,
        name: artist.name,
        image: artist.image,
        genres: Array.isArray(artist.genres) ? artist.genres : [],
        popularity: artist.popularity || 0,
        upcoming_shows: artist.upcomingShows || artist.upcoming_shows || 0,
        stored_tracks: artist.stored_tracks || null,
        updated_at: new Date().toISOString()
      });
    
    if (error) {
      console.error("Error saving artist to database:", error);
    }
  } catch (error) {
    console.error("Error in saveArtistToDatabase:", error);
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
        return;
      }
    }
    
    // Insert or update venue
    const { error } = await supabase
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
  } catch (error) {
    console.error("Error in saveVenueToDatabase:", error);
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
        return;
      }
    }
    
    // Insert or update show
    const { error } = await supabase
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
  } catch (error) {
    console.error("Error in saveShowToDatabase:", error);
  }
}
