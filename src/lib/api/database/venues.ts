
import { supabase } from "@/integrations/supabase/client";

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
