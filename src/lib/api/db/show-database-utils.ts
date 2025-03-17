
import { supabase } from '@/integrations/supabase/client';

/**
 * Save a show to the database
 */
export async function saveShowToDatabase(show: any) {
  try {
    if (!show || !show.id) {
      console.error("Invalid show data provided");
      return null;
    }
    
    console.log(`Saving show ${show.id} to database with data:`, JSON.stringify(show));
    
    // Check if show already exists
    const { data: existingShow, error: checkError } = await supabase
      .from('shows')
      .select('id')
      .eq('id', show.id)
      .maybeSingle();
    
    if (checkError) {
      console.error("Error checking for existing show:", checkError);
      return null;
    }
    
    // Make sure required fields are present
    const showData = {
      id: show.id,
      name: show.name || `Show ${show.id}`,
      date: show.date || null,
      artist_id: show.artist_id || null,
      venue_id: show.venue_id || null,
      ticket_url: show.ticket_url || null,
      image_url: show.image_url || null,
      popularity: show.popularity || 0,
      genre_ids: Array.isArray(show.genre_ids) ? show.genre_ids : [],
      updated_at: new Date().toISOString()
    };
    
    // Update or insert show
    if (existingShow) {
      console.log(`Updating existing show ${show.id}`);
      
      const { error: updateError } = await supabase
        .from('shows')
        .update(showData)
        .eq('id', show.id);
      
      if (updateError) {
        console.error("Error updating show:", updateError);
        return null;
      }
      
      console.log(`Successfully updated show ${show.id}`);
      return show.id;
    } else {
      console.log(`Inserting new show ${show.id}`);
      
      const { data, error: insertError } = await supabase
        .from('shows')
        .insert({
          ...showData,
          created_at: new Date().toISOString()
        })
        .select('id')
        .single();
      
      if (insertError) {
        console.error("Error inserting show:", insertError);
        console.error("Show data:", showData);
        return null;
      }
      
      console.log(`Successfully inserted new show ${show.id}`);
      return show.id;
    }
  } catch (error) {
    console.error("Error in saveShowToDatabase:", error);
    console.error("Show data:", show);
    return null;
  }
}
