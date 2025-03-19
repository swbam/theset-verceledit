
import { supabase } from "@/integrations/supabase/client";

/**
 * Save venue to database
 */
export async function saveVenueToDatabase(venue: any) {
  try {
    if (!venue || !venue.id) {
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
        console.error("Error checking venue in database:", checkError);
        // Continue with insert/update anyway
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
    
    // Prepare venue data
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
    
    // For debugging: log what we're trying to insert
    console.log("Inserting/updating venue with data:", JSON.stringify(venueData, null, 2));
    
    // Insert or update venue - wrapped in try/catch to handle permission errors
    try {
      const { data, error } = await supabase
        .from('venues')
        .upsert(venueData)
        .select();
      
      if (error) {
        console.error("Error saving venue to database:", error);
        
        // If it's a permission error, try a fallback insert-only approach
        if (error.code === '42501' || error.message.includes('permission denied')) {
          console.log("Permission error detected. Trying insert-only approach...");
          
          const { data: insertData, error: insertError } = await supabase
            .from('venues')
            .insert(venueData)
            .select();
            
          if (insertError) {
            console.error("Insert-only approach also failed:", insertError);
            return venueData; // Return our data object as fallback
          }
          
          console.log("Insert-only approach succeeded");
          return insertData?.[0] || venueData;
        }
        
        return venueData; // Return our data object as fallback
      }
      
      console.log(`Successfully saved venue ${venue.name} to database`);
      return data?.[0] || existingVenue || venueData;
    } catch (saveError) {
      console.error("Error in saveVenueToDatabase:", saveError);
      return venueData; // Return our data object as fallback
    }
  } catch (error) {
    console.error("Error in saveVenueToDatabase:", error);
    return venue; // Return the original venue as fallback
  }
}

/**
 * Get venue by ID
 */
export async function getVenueById(venueId: string) {
  try {
    const { data, error } = await supabase
      .from('venues')
      .select('*')
      .eq('id', venueId)
      .maybeSingle();
    
    if (error) {
      console.error("Error fetching venue from database:", error);
      return null;
    }
    
    return data;
  } catch (error) {
    console.error("Error in getVenueById:", error);
    return null;
  }
}
