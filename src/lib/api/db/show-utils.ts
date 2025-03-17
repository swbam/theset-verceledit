
import { supabase } from "@/integrations/supabase/client";
import { getOrCreateSetlistForShow } from "./setlist-utils";

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
      const lastUpdated = new Date(existingShow.updated_at || new Date());
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
    } else {
      console.log("Show saved successfully, now creating/updating setlist");
      
      // If it's a new show or we're updating an existing one, ensure it has a setlist
      // Pass the artist_id so we can auto-populate the setlist with top tracks
      if (show.artist_id) {
        await getOrCreateSetlistForShow(show.id, show.artist_id);
      } else {
        console.warn("No artist_id provided for show, cannot auto-populate setlist");
      }
    }
    
    return existingShow || show;
  } catch (error) {
    console.error("Error in saveShowToDatabase:", error);
    return null;
  }
}
