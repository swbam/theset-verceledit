
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ErrorSource, handleError } from '@/lib/error-handling';

/**
 * Save artist to database
 */
export async function saveArtistToDatabase(artist: any) {
  try {
    if (!artist || !artist.id) {
      console.error("Invalid artist object:", artist);
      return null;
    }
    
    console.log(`Attempting to save artist to database: ${artist.name} (ID: ${artist.id})`);
    
    // Check if artist already exists
    try {
      const { data: existingArtist, error: checkError } = await supabase
        .from('artists')
        .select('*')
        .eq('id', artist.id)
        .maybeSingle();
      
      if (checkError) {
        // If we get a permission error, just return the artist without saving
        if (checkError.code === '42501') {
          console.warn("Database permission denied. Skipping save operation for artist:", artist.name);
          return artist;
        }
        
        console.error("Error checking if artist exists:", checkError);
        // Continue anyway to try the upsert
      }
      
      if (existingArtist) {
        console.log(`Artist ${artist.name} already exists in database.`);
        return existingArtist;
      }
    } catch (checkError) {
      console.error("Error checking artist existence:", checkError);
      // Continue with insert attempt
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
    try {
      const { data, error } = await supabase
        .from('artists')
        .upsert(artistData)
        .select();
      
      if (error) {
        // If permission denied, just log a warning and return the artist
        if (error.code === '42501') {
          console.warn("Permission denied when saving artist. RLS policy may need adjustment.");
          return artist;
        }
        
        console.error("Error saving artist to database:", error);
        console.error("Detailed error info:", JSON.stringify(error));
        return artist;
      }
      
      console.log(`Successfully saved artist ${artist.name} to database:`, data);
      return data?.[0] || artist;
    } catch (upsertError) {
      console.error("Upsert error:", upsertError);
      return artist;
    }
  } catch (error) {
    console.error("Error in saveArtistToDatabase:", error);
    
    // Still return the artist so downstream code works
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
    try {
      const { data: existingShow, error: checkError } = await supabase
        .from('shows')
        .select('*')
        .eq('id', show.id)
        .maybeSingle();
      
      if (checkError) {
        // If permission denied, just return the show without saving
        if (checkError.code === '42501') {
          console.warn("Database permission denied. Skipping save operation for show:", show.name);
          return show;
        }
        
        console.error("Error checking if show exists:", checkError);
      }
      
      if (existingShow) {
        console.log(`Show ${show.name} already exists in database.`);
        return existingShow;
      }
    } catch (checkError) {
      console.error("Error checking show existence:", checkError);
      // Continue with insert attempt
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
    try {
      const { data, error } = await supabase
        .from('shows')
        .upsert(showData)
        .select();
      
      if (error) {
        // If permission denied, just log a warning and return the show
        if (error.code === '42501') {
          console.warn("Permission denied when saving show. RLS policy may need adjustment.");
          return show;
        }
        
        console.error("Error saving show to database:", error);
        console.error("Detailed error info:", JSON.stringify(error));
        return show;
      }
      
      console.log(`Successfully saved show ${show.name} to database:`, data);
      return data?.[0] || show;
    } catch (upsertError) {
      console.error("Upsert error:", upsertError);
      return show;
    }
  } catch (error) {
    console.error("Error in saveShowToDatabase:", error);
    
    // Still return the show so downstream code works
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
    try {
      const { data: existingVenue, error: checkError } = await supabase
        .from('venues')
        .select('*')
        .eq('id', venue.id)
        .maybeSingle();
      
      if (checkError) {
        // If permission denied, just return the venue without saving
        if (checkError.code === '42501') {
          console.warn("Database permission denied. Skipping save operation for venue:", venue.name);
          return venue;
        }
        
        console.error("Error checking if venue exists:", checkError);
      }
      
      if (existingVenue) {
        console.log(`Venue ${venue.name} already exists in database.`);
        return existingVenue;
      }
    } catch (checkError) {
      console.error("Error checking venue existence:", checkError);
      // Continue with insert attempt
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
    try {
      const { data, error } = await supabase
        .from('venues')
        .upsert(venueData)
        .select();
      
      if (error) {
        // If permission denied, just log a warning and return the venue
        if (error.code === '42501') {
          console.warn("Permission denied when saving venue. RLS policy may need adjustment.");
          return venue;
        }
        
        console.error("Error saving venue to database:", error);
        console.error("Detailed error info:", JSON.stringify(error));
        return venue;
      }
      
      console.log(`Successfully saved venue ${venue.name} to database:`, data);
      return data?.[0] || venue;
    } catch (upsertError) {
      console.error("Upsert error:", upsertError);
      return venue;
    }
  } catch (error) {
    console.error("Error in saveVenueToDatabase:", error);
    
    // Still return the venue so downstream code works
    return venue;
  }
}
