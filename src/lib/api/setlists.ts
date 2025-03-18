import { supabase } from '../supabase';
import { PastSetlist } from '@/types/artist';
import { savePastSetlistsToDatabase } from './db/setlist-utils';

/**
 * Fetches past setlists for a specific artist
 * @param artistId The ID of the artist
 * @returns An array of past setlists
 */
export const fetchPastSetlists = async (artistId: string): Promise<PastSetlist[]> => {
  try {
    // Query the database for past setlists
    const { data, error } = await supabase
      .from('past_setlists')
      .select(`
        id,
        date,
        venue:venues (
          name,
          city,
          state,
          country
        ),
        songs,
        artist_id
      `)
      .eq('artist_id', artistId)
      .order('date', { ascending: false })
      .limit(4);
    
    if (error) {
      console.error('Error fetching past setlists:', error);
      throw new Error(`Failed to fetch past setlists: ${error.message}`);
    }
    
    if (!data || data.length === 0) {
      // If no setlists in database, try to fetch from the API
      try {
        // Get artist name from the database
        const { data: artistData } = await supabase
          .from('artists')
          .select('name')
          .eq('id', artistId)
          .single();
        
        if (!artistData?.name) {
          console.log('Artist name not found in database');
          return [];
        }
        
        // Call the Setlist.fm API via a Supabase Edge Function
        const { data: apiData, error: fnError } = await supabase.functions.invoke('fetch-setlists', {
          body: { 
            artistId, 
            artistName: artistData.name
          }
        });
        
        if (fnError) {
          console.error('Error calling fetch-setlists function:', fnError);
          return [];
        }
        
        if (!apiData?.setlists || !Array.isArray(apiData.setlists) || apiData.setlists.length === 0) {
          console.log('No setlists returned from API');
          return [];
        }
        
        // Save the setlists to the database for future use
        await savePastSetlistsToDatabase(artistId, apiData.setlists);
        
        return apiData.setlists;
      } catch (apiError) {
        console.error('Error fetching setlists from API:', apiError);
        return [];
      }
    }
    
    return data as PastSetlist[];
  } catch (error) {
    console.error('Error in fetchPastSetlists:', error);
    throw error;
  }
};

/**
 * Fetches a specific setlist by ID
 * @param setlistId The ID of the setlist
 * @returns The setlist with songs and venue information
 */
export const fetchSetlistById = async (setlistId: string) => {
  try {
    const { data, error } = await supabase
      .from('setlists')
      .select(`
        id,
        show:shows (
          id,
          date,
          name
        ),
        artist:artists (
          id,
          name,
          image
        ),
        setlist_songs (
          id,
          title,
          album,
          spotify_url,
          vote_count
        )
      `)
      .eq('id', setlistId)
      .single();
    
    if (error) {
      console.error('Error fetching setlist:', error);
      throw new Error(`Failed to fetch setlist: ${error.message}`);
    }
    
    if (!data) {
      throw new Error('Setlist not found');
    }
    
    return data;
  } catch (error) {
    console.error('Error in fetchSetlistById:', error);
    throw error;
  }
}; 