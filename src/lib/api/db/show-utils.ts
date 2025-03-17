
import { supabase } from '@/integrations/supabase/client';

/**
 * Create a setlist for a show if it doesn't exist
 */
export async function createSetlistForShow(show: any) {
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

/**
 * Get all shows for an artist
 */
export async function getShowsForArtist(artistId: string) {
  try {
    const { data, error } = await supabase
      .from('shows')
      .select(`
        *,
        venue:venues (*)
      `)
      .eq('artist_id', artistId)
      .order('date', { ascending: true });
    
    if (error) {
      console.error("Error fetching shows for artist:", error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error("Error in getShowsForArtist:", error);
    return [];
  }
}
