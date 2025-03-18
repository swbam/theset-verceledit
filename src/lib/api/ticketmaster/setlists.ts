
import { supabase } from '@/lib/supabase';

/**
 * Fetch past setlists for an artist from setlist.fm
 * @param artistId The artist ID
 * @param artistName The artist name
 * @returns Array of past setlists
 */
export const fetchPastSetlists = async (artistId: string, artistName: string) => {
  try {
    const { data, error } = await supabase.functions.invoke('fetch-past-setlists', {
      body: { artistId, artistName }
    });
    
    if (error) {
      console.error("Error fetching past setlists:", error);
      throw error;
    }
    
    return data.setlists;
  } catch (error) {
    console.error("Error in fetchPastSetlists:", error);
    throw error;
  }
};
