
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
    
    let result = null;
    
    // Update or insert show
    if (existingShow) {
      console.log(`Updating existing show ${show.id}`);
      
      const { data, error: updateError } = await supabase
        .from('shows')
        .update(showData)
        .eq('id', show.id)
        .select('id')
        .single();
      
      if (updateError) {
        console.error("Error updating show:", updateError);
        return null;
      }
      
      console.log(`Successfully updated show ${show.id}`);
      result = data.id;
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
      result = data.id;
    }
    
    // After successfully saving the show, create a setlist for it if it doesn't exist
    if (result) {
      await createSetlistForShow(show);
    }
    
    return result;
  } catch (error) {
    console.error("Error in saveShowToDatabase:", error);
    console.error("Show data:", show);
    return null;
  }
}

/**
 * Create a setlist for a show if it doesn't exist
 */
async function createSetlistForShow(show: any) {
  try {
    if (!show || !show.id) {
      console.error("Invalid show data provided");
      return null;
    }
    
    console.log(`Checking for existing setlist for show ${show.id}`);
    
    // Check if a setlist already exists for this show
    const { data: existingSetlist, error: checkError } = await supabase
      .from('setlists')
      .select('id')
      .eq('show_id', show.id)
      .maybeSingle();
    
    if (checkError) {
      console.error("Error checking for existing setlist:", checkError);
      return null;
    }
    
    // If a setlist already exists, return it
    if (existingSetlist) {
      console.log(`Found existing setlist ${existingSetlist.id} for show ${show.id}`);
      return existingSetlist.id;
    }
    
    // Create a new setlist
    console.log(`Creating new setlist for show ${show.id}`);
    const { data: newSetlist, error: createError } = await supabase
      .from('setlists')
      .insert({
        show_id: show.id,
        last_updated: new Date().toISOString()
      })
      .select('id')
      .single();
    
    if (createError) {
      console.error("Error creating setlist:", createError);
      return null;
    }
    
    console.log(`Created setlist ${newSetlist.id} for show ${show.id}`);
    return newSetlist.id;
  } catch (error) {
    console.error("Error in createSetlistForShow:", error);
    return null;
  }
}
