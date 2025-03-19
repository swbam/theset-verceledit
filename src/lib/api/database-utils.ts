
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

/**
 * Save artist to database
 */
export async function saveArtistToDatabase(artist: any) {
  try {
    if (!artist || !artist.id) {
      console.error("Invalid artist object:", artist);
      return null;
    }
    
    console.log(`Attempting to save artist to database: ${artist.name}`);
    
    // Check if artist already exists
    const { data: existingArtist, error: checkError } = await supabase
      .from('artists')
      .select('*')
      .eq('id', artist.id)
      .maybeSingle();
    
    if (checkError) {
      console.error("Error checking if artist exists:", checkError);
      return null;
    }
    
    // Prepare the artist data for upsert
    const artistData = {
      id: artist.id,
      name: artist.name,
      image_url: artist.image || artist.image_url,
      spotify_id: artist.spotify_id,
      spotify_url: artist.spotify_url,
      genres: Array.isArray(artist.genres) ? artist.genres : [],
      popularity: artist.popularity || 0,
      upcoming_shows: artist.upcomingShows || artist.upcoming_shows || 0,
      updated_at: new Date().toISOString()
    };
    
    console.log("Saving artist data:", artistData);
    
    // Insert or update artist
    const { data, error } = await supabase
      .from('artists')
      .upsert(artistData)
      .select();
    
    if (error) {
      console.error("Error saving artist to database:", error);
      return existingArtist || artist;
    }
    
    console.log(`Successfully saved artist ${artist.name} to database`);
    return data?.[0] || existingArtist || artist;
  } catch (error) {
    console.error("Error in saveArtistToDatabase:", error);
    // Return the original artist object to not break downstream code
    return artist; 
  }
}

/**
 * Save show to database
 */
export async function saveShowToDatabase(show: any) {
  try {
    if (!show || !show.id) {
      console.error("Invalid show object:", show);
      return null;
    }
    
    console.log(`Attempting to save show to database: ${show.name} (ID: ${show.id})`);
    
    // Check if show already exists
    const { data: existingShow, error: checkError } = await supabase
      .from('shows')
      .select('*')
      .eq('id', show.id)
      .maybeSingle();
    
    if (checkError) {
      console.error("Error checking if show exists:", checkError);
      return null;
    }
    
    // Prepare the show data for upsert
    const showData = {
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
    };
    
    console.log("Saving show data:", showData);
    
    // Insert or update show
    const { data, error } = await supabase
      .from('shows')
      .upsert(showData)
      .select();
    
    if (error) {
      console.error("Error saving show to database:", error);
      return existingShow || show;
    }
    
    console.log(`Successfully saved show ${show.name} to database`);
    return data?.[0] || existingShow || show;
  } catch (error) {
    console.error("Error in saveShowToDatabase:", error);
    // Return the original show object to not break downstream code
    return show;
  }
}

/**
 * Save venue to database
 */
export async function saveVenueToDatabase(venue: any) {
  try {
    if (!venue || !venue.id) {
      console.error("Invalid venue object:", venue);
      return null;
    }
    
    console.log(`Attempting to save venue to database: ${venue.name} (ID: ${venue.id})`);
    
    // Check if venue already exists
    const { data: existingVenue, error: checkError } = await supabase
      .from('venues')
      .select('*')
      .eq('id', venue.id)
      .maybeSingle();
    
    if (checkError) {
      console.error("Error checking if venue exists:", checkError);
      return null;
    }
    
    // Prepare the venue data for upsert
    const venueData = {
      id: venue.id,
      name: venue.name,
      city: venue.city,
      state: venue.state,
      country: venue.country,
      address: venue.address,
      postal_code: venue.postal_code,
      location: venue.location,
      updated_at: new Date().toISOString()
    };
    
    console.log("Saving venue data:", venueData);
    
    // Insert or update venue
    const { data, error } = await supabase
      .from('venues')
      .upsert(venueData)
      .select();
    
    if (error) {
      console.error("Error saving venue to database:", error);
      return existingVenue || venue;
    }
    
    console.log(`Successfully saved venue ${venue.name} to database`);
    return data?.[0] || existingVenue || venue;
  } catch (error) {
    console.error("Error in saveVenueToDatabase:", error);
    // Return the original venue object to not break downstream code
    return venue;
  }
}
