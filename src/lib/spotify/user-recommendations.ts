
import { supabase } from '@/integrations/supabase/client';

// Get my top artists
export const getMyTopArtists = async () => {
  try {
    console.log('Fetching user top artists from Spotify API');
    
    // In a real implementation, we would call Spotify API with the user's access token
    // For now, we'll simulate with mock data
    const { data, error } = await supabase
      .from('artists')
      .select('*')
      .order('popularity', { ascending: false })
      .limit(9);
    
    if (error) throw error;
    
    console.log(`Fetched ${data.length} top artists for the user`);
    return data;
  } catch (error) {
    console.error('Error getting user top artists:', error);
    throw new Error('Failed to get your top artists from Spotify');
  }
};
