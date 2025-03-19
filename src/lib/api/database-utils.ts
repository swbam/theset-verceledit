
import { supabase } from "@/integrations/supabase/client";
import { fetchAndStoreArtistTracks } from "./database";

/**
 * Save an artist to the database, handling permission errors gracefully
 */
export async function saveArtistToDatabase(artist: any) {
  try {
    if (!artist || !artist.id || !artist.name) {
      console.error("Invalid artist object:", artist);
      return null;
    }
    
    console.log(`Saving artist to database: ${artist.name} (ID: ${artist.id})`);
    
    // Check if artist already exists
    try {
      const { data: existingArtist, error: checkError } = await supabase
        .from('artists')
        .select('id, updated_at, spotify_id')
        .eq('id', artist.id)
        .maybeSingle();
      
      if (checkError) {
        // If we get a permission error, log but continue (return the original artist)
        if (checkError.code === '42501') { // permission denied error
          console.log(`Permission denied when checking artist ${artist.name} in database - continuing with API data`);
          return artist;
        }
        
        console.error("Error checking artist in database:", checkError);
        return artist; // Return the original artist even if DB check fails
      }
      
      // If artist exists and was updated recently, don't update
      if (existingArtist) {
        const lastUpdated = new Date(existingArtist.updated_at);
        const now = new Date();
        const daysSinceUpdate = (now.getTime() - lastUpdated.getTime()) / (1000 * 60 * 60 * 24);
        
        // Only update if it's been more than 7 days
        if (daysSinceUpdate < 7) {
          console.log(`Artist ${artist.name} was updated ${daysSinceUpdate.toFixed(1)} days ago, skipping update`);
          
          // If artist has Spotify ID but no tracks, fetch them in background
          if (existingArtist.spotify_id && !artist.stored_tracks) {
            fetchAndStoreArtistTracks(existingArtist.id, existingArtist.spotify_id, artist.name)
              .catch(err => console.error(`Background track fetch error:`, err));
          }
          
          return existingArtist;
        }
        
        console.log(`Artist ${artist.name} needs update (last updated ${daysSinceUpdate.toFixed(1)} days ago)`);
      } else {
        console.log(`Artist ${artist.name} is new, creating in database`);
      }
    } catch (checkError) {
      console.error("Error checking if artist exists:", checkError);
      // Continue to try adding the artist anyway
    }
    
    // Prepare artist data
    const artistData = {
      id: artist.id,
      name: artist.name,
      image_url: artist.image,
      spotify_id: artist.spotify_id,
      spotify_url: artist.spotify_url,
      upcoming_shows: artist.upcomingShows || 0,
      updated_at: new Date().toISOString()
    };
    
    // Insert or update artist
    try {
      const { data, error } = await supabase
        .from('artists')
        .upsert(artistData)
        .select();
      
      if (error) {
        // If we get a permission error, log but continue (return the original artist)
        if (error.code === '42501') { // permission denied error
          console.log(`Permission denied when saving artist ${artist.name} to database - continuing with API data`);
          return artist;
        }
        
        console.error("Error saving artist to database:", error);
        return artist; // Return the original artist even if DB save fails
      }
      
      console.log(`Successfully saved artist ${artist.name} to database`);
      
      // If artist has Spotify ID, fetch their tracks in the background
      if (artist.spotify_id) {
        fetchAndStoreArtistTracks(artist.id, artist.spotify_id, artist.name)
          .catch(err => console.error(`Error fetching tracks for artist ${artist.name}:`, err));
      }
      
      return data?.[0] || artist;
    } catch (saveError) {
      console.error("Error in saveArtistToDatabase:", saveError);
      return artist; // Return the original artist even if DB save fails
    }
  } catch (error) {
    console.error("Unexpected error in saveArtistToDatabase:", error);
    return artist; // Return the original artist even if unexpected error occurs
  }
}

/**
 * Save a venue to the database, handling permission errors gracefully
 */
export async function saveVenueToDatabase(venue: any) {
  try {
    if (!venue || !venue.id || !venue.name) {
      console.error("Invalid venue object:", venue);
      return null;
    }
    
    console.log(`Processing venue: ${venue.name} (ID: ${venue.id})`);
    
    // Check if venue already exists
    try {
      const { data: existingVenue, error: checkError } = await supabase
        .from('venues')
        .select('id, updated_at')
        .eq('id', venue.id)
        .maybeSingle();
      
      if (checkError) {
        // If we get a permission error, log but continue (return the original venue)
        if (checkError.code === '42501') { // permission denied error
          console.log(`Permission denied when checking venue ${venue.name} in database - continuing with API data`);
          return venue;
        }
        
        console.error("Error checking venue in database:", checkError);
        return venue; // Return the original venue even if DB check fails
      }
      
      // If venue exists and was updated recently, don't update
      if (existingVenue) {
        const lastUpdated = new Date(existingVenue.updated_at);
        const now = new Date();
        const daysSinceUpdate = (now.getTime() - lastUpdated.getTime()) / (1000 * 60 * 60 * 24);
        
        // Only update if it's been more than 30 days
        if (daysSinceUpdate < 30) {
          console.log(`Venue ${venue.name} was updated ${daysSinceUpdate.toFixed(1)} days ago, skipping update`);
          return existingVenue;
        }
        
        console.log(`Venue ${venue.name} needs update (last updated ${daysSinceUpdate.toFixed(1)} days ago)`);
      } else {
        console.log(`Venue ${venue.name} is new, creating in database`);
      }
    } catch (checkError) {
      console.error("Error checking if venue exists:", checkError);
      // Continue to try adding the venue anyway
    }
    
    // Insert or update venue
    try {
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
        })
        .select();
      
      if (error) {
        // If we get a permission error, log but continue (return the original venue)
        if (error.code === '42501') { // permission denied error
          console.log(`Permission denied when saving venue ${venue.name} to database - continuing with API data`);
          return venue;
        }
        
        console.error("Error saving venue to database:", error);
        return venue; // Return the original venue even if DB save fails
      }
      
      console.log(`Successfully saved venue ${venue.name} to database`);
      return data?.[0] || venue;
    } catch (saveError) {
      console.error("Error in saveVenueToDatabase:", saveError);
      return venue; // Return the original venue even if DB save fails
    }
  } catch (error) {
    console.error("Unexpected error in saveVenueToDatabase:", error);
    return venue; // Return the original venue even if unexpected error occurs
  }
}

/**
 * Save a show to the database, handling permission errors gracefully
 */
export async function saveShowToDatabase(show: any) {
  try {
    if (!show || !show.id) {
      console.error("Invalid show object:", show);
      return null;
    }
    
    console.log(`Processing show: ${show.name} (ID: ${show.id})`);
    
    // Check if show already exists
    try {
      const { data: existingShow, error: checkError } = await supabase
        .from('shows')
        .select('id, updated_at, artist_id, venue_id')
        .eq('id', show.id)
        .maybeSingle();
      
      if (checkError) {
        // If we get a permission error, log but continue (return the original show)
        if (checkError.code === '42501') { // permission denied error
          console.log(`Permission denied when checking show ${show.name} in database - continuing with API data`);
          return show;
        }
        
        console.error("Error checking show in database:", checkError);
        return show; // Return the original show even if DB check fails
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
    } catch (checkError) {
      console.error("Error checking if show exists:", checkError);
      // Continue to try adding the show anyway
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
      }
    }
    
    // Insert or update show
    try {
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
        // If we get a permission error, log but continue (return the original show)
        if (error.code === '42501') { // permission denied error
          console.log(`Permission denied when saving show ${show.name} to database - continuing with API data`);
          return show;
        }
        
        console.error("Error saving show to database:", error);
        return show; // Return the original show even if DB save fails
      }
      
      console.log(`Successfully saved show ${show.name} to database`);
      return data?.[0] || show;
    } catch (saveError) {
      console.error("Error in saveShowToDatabase:", saveError);
      return show; // Return the original show even if DB save fails
    }
  } catch (error) {
    console.error("Unexpected error in saveShowToDatabase:", error);
    return show; // Return the original show even if unexpected error occurs
  }
}
