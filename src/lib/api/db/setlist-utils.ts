
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * Create or get setlist for a show
 */
export async function getOrCreateSetlistForShow(showId: string) {
  try {
    if (!showId) return null;
    
    // Check if setlist exists
    const { data: existingSetlist, error: checkError } = await supabase
      .from('setlists')
      .select('id')
      .eq('show_id', showId)
      .maybeSingle();
    
    if (checkError) {
      console.error("Error checking setlist in database:", checkError);
      return null;
    }
    
    // If setlist exists, return it
    if (existingSetlist) {
      return existingSetlist.id;
    }
    
    // Create new setlist
    const { data: newSetlist, error: createError } = await supabase
      .from('setlists')
      .insert({
        show_id: showId,
        created_at: new Date().toISOString(),
        last_updated: new Date().toISOString()
      })
      .select('id')
      .single();
    
    if (createError) {
      console.error("Error creating setlist:", createError);
      return null;
    }
    
    return newSetlist.id;
  } catch (error) {
    console.error("Error in getOrCreateSetlistForShow:", error);
    return null;
  }
}

/**
 * Add song to setlist
 */
export async function addSongToSetlist(setlistId: string, trackId: string, userId?: string) {
  try {
    if (!setlistId || !trackId) return null;
    
    // Check if song already exists in setlist
    const { data: existingSong, error: checkError } = await supabase
      .from('setlist_songs')
      .select('id')
      .eq('setlist_id', setlistId)
      .eq('track_id', trackId)
      .maybeSingle();
    
    if (checkError) {
      console.error("Error checking song in setlist:", checkError);
      return null;
    }
    
    // If song exists, return it
    if (existingSong) {
      return existingSong.id;
    }
    
    // Add new song to setlist
    const { data: newSong, error: createError } = await supabase
      .from('setlist_songs')
      .insert({
        setlist_id: setlistId,
        track_id: trackId,
        votes: 0,
        suggested_by: userId,
        created_at: new Date().toISOString()
      })
      .select('id')
      .single();
    
    if (createError) {
      console.error("Error adding song to setlist:", createError);
      return null;
    }
    
    return newSong.id;
  } catch (error) {
    console.error("Error in addSongToSetlist:", error);
    return null;
  }
}

/**
 * Get setlist songs with vote counts for a specific show
 */
export async function getSetlistSongsForShow(showId: string) {
  try {
    if (!showId) return [];
    
    // Get setlist for show
    const { data: setlist, error: setlistError } = await supabase
      .from('setlists')
      .select('id')
      .eq('show_id', showId)
      .maybeSingle();
    
    if (setlistError || !setlist) {
      console.error("Error getting setlist for show:", setlistError);
      return [];
    }
    
    // Get setlist songs with related track info
    const { data: songs, error: songsError } = await supabase
      .from('setlist_songs')
      .select(`
        id,
        votes,
        track_id,
        top_tracks (
          id,
          name,
          spotify_url,
          preview_url,
          album_name,
          album_image_url
        )
      `)
      .eq('setlist_id', setlist.id);
    
    if (songsError) {
      console.error("Error getting setlist songs:", songsError);
      return [];
    }
    
    return songs;
  } catch (error) {
    console.error("Error in getSetlistSongsForShow:", error);
    return [];
  }
}
