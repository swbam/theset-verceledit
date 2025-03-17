
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
    
    console.log(`Saving show ${show.id} to database`);
    
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
    
    // Update or insert show
    if (existingShow) {
      console.log(`Updating existing show ${show.id}`);
      
      const { error: updateError } = await supabase
        .from('shows')
        .update({
          name: show.name,
          date: show.date,
          artist_id: show.artist_id,
          venue_id: show.venue_id,
          ticket_url: show.ticket_url,
          image_url: show.image_url,
          popularity: show.popularity || 0,
          genre_ids: show.genre_ids || [],
          updated_at: new Date().toISOString()
        })
        .eq('id', show.id);
      
      if (updateError) {
        console.error("Error updating show:", updateError);
        return null;
      }
      
      return show.id;
    } else {
      console.log(`Inserting new show ${show.id}`);
      
      const { error: insertError } = await supabase
        .from('shows')
        .insert({
          id: show.id,
          name: show.name,
          date: show.date,
          artist_id: show.artist_id,
          venue_id: show.venue_id,
          ticket_url: show.ticket_url,
          image_url: show.image_url,
          popularity: show.popularity || 0,
          genre_ids: show.genre_ids || [],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      
      if (insertError) {
        console.error("Error inserting show:", insertError);
        return null;
      }
      
      return show.id;
    }
  } catch (error) {
    console.error("Error in saveShowToDatabase:", error);
    return null;
  }
}
