
import { supabase } from "@/integrations/supabase/client";
import { getOrCreateSetlistForShow } from "./setlist-utils";

/**
 * Save show to database
 */
export async function saveShowToDatabase(show: any) {
  try {
    if (!show || !show.id) return;
    
    console.log(`Saving show to database: ${showId} - ${show.name}`);
    
    // Check if show already exists
    const { data: existingShow, error: checkError } = await supabase
      .from('shows')
      .select('id, updated_at, artist_id')
      .eq('id', show.id)
      .maybeSingle();
    
    if (checkError) {
      console.error("Error checking show in database:", checkError);
      return;
    }
    
    // Get the artist_id either from existing show or from the show parameter
    const artistId = existingShow?.artist_id || show.artist_id;
    let shouldCreateSetlist = false;
    
    // If show exists and was updated recently, don't update
    if (existingShow) {
      const lastUpdated = new Date(existingShow.updated_at || new Date());
      const now = new Date();
      const hoursSinceUpdate = (now.getTime() - lastUpdated.getTime()) / (1000 * 60 * 60);
      
      // Only update if it's been more than 24 hours
      if (hoursSinceUpdate < 24) {
        console.log(`Show ${show.id} was updated recently (${hoursSinceUpdate.toFixed(2)} hours ago), skipping update`);
        
        // Still ensure it has a setlist even if we don't update the show
        shouldCreateSetlist = true;
      } else {
        // Show exists but needs update
        shouldCreateSetlist = true;
      }
    } else {
      // New show, definitely create setlist
      shouldCreateSetlist = true;
    }
    
    if (!existingShow || shouldCreateSetlist) {
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
        console.log("Show saved successfully");
      }
    }
    
    // Always try to create or get setlist for this show
    if (artistId) {
      console.log(`Creating/getting setlist for show ${show.id} with artist ${artistId}`);
      const setlistId = await getOrCreateSetlistForShow(show.id, artistId);
      console.log(`Setlist ID for show ${show.id}: ${setlistId}`);
    } else {
      console.warn(`No artist_id available for show ${show.id}, cannot create setlist`);
      
      // Try to get artist_id from the database if we don't have it
      if (show.id && !artistId) {
        const { data: showData } = await supabase
          .from('shows')
          .select('artist_id')
          .eq('id', show.id)
          .single();
          
        if (showData?.artist_id) {
          console.log(`Found artist_id ${showData.artist_id} for show ${show.id}, creating setlist`);
          await getOrCreateSetlistForShow(show.id, showData.artist_id);
        }
      }
    }
    
    return existingShow || show;
  } catch (error) {
    console.error("Error in saveShowToDatabase:", error);
    return null;
  }
}
