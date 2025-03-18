
import { supabase } from '@/integrations/supabase/client';

/**
 * Get user's top artists from Spotify
 * In a full implementation, this would use the Spotify API with the user's access token
 */
export const getMyTopArtists = async () => {
  try {
    console.log('Fetching user top artists from Spotify API');
    
    // Check if user is authenticated
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      console.log('User not authenticated, returning mock data');
      return getMockTopArtists();
    }
    
    // In a real implementation, we would call Spotify API with the user's access token
    // For now, we'll simulate with database data
    const { data, error } = await supabase
      .from('artists')
      .select('*')
      .order('popularity', { ascending: false })
      .limit(9);
    
    if (error) throw error;
    
    console.log(`Fetched ${data.length} top artists for the user`);
    
    // Enhance the data with randomized popularity scores
    return data.map(artist => ({
      ...artist,
      popularity: artist.popularity || Math.floor(Math.random() * 30) + 70,
      upcoming_shows: artist.upcoming_shows || Math.floor(Math.random() * 5) + 1
    }));
  } catch (error) {
    console.error('Error getting user top artists:', error);
    return getMockTopArtists();
  }
};

/**
 * Get mock top artists for demo purposes
 */
const getMockTopArtists = () => {
  return [
    {
      id: 'K8vZ9171K77',
      name: 'Taylor Swift',
      image: 'https://s1.ticketm.net/dam/a/8af/da84e788-6ede-4e8a-8371-c42c0e4218af_SOURCE',
      genres: ['Pop', 'Pop Rock'],
      popularity: 98,
      upcoming_shows: 12
    },
    {
      id: 'K8vZ9171oC0',
      name: 'Ed Sheeran',
      image: 'https://s1.ticketm.net/dam/a/aad/31d32c76-3858-4929-a43c-5a5aadd68aad_SOURCE',
      genres: ['Pop', 'Singer-Songwriter'],
      popularity: 95,
      upcoming_shows: 8
    },
    {
      id: 'K8vZ9171oZ0',
      name: 'Beyoncé',
      image: 'https://s1.ticketm.net/dam/a/83c/6d4bf941-91c3-4293-b58a-84889fa0883c_SOURCE',
      genres: ['R&B', 'Pop'],
      popularity: 96,
      upcoming_shows: 5
    },
    {
      id: 'K8vZ9171580',
      name: 'Coldplay',
      image: 'https://s1.ticketm.net/dam/a/ba3/8ae00baa-ebf2-4c3b-be3e-6837d8a92ba3_SOURCE',
      genres: ['Alternative Rock', 'Pop Rock'],
      popularity: 91,
      upcoming_shows: 7
    },
    {
      id: 'K8vZ9171K9V',
      name: 'The Weeknd',
      image: 'https://s1.ticketm.net/dam/a/ca8/3f448f72-c2c2-4fe1-9ca3-49d0e15f5ca8_SOURCE',
      genres: ['R&B', 'Pop'],
      popularity: 93,
      upcoming_shows: 4
    }
  ];
};

/**
 * Get personalized show recommendations for the user
 */
export const getPersonalizedShowRecommendations = async (limit = 4) => {
  try {
    // First get top artists
    const topArtists = await getMyTopArtists();
    
    // Then fetch shows for these artists
    const { data: shows, error } = await supabase
      .from('shows')
      .select('*, artist(*), venue(*)')
      .in('artist_id', topArtists.map(a => a.id))
      .order('date', { ascending: true })
      .limit(limit);
    
    if (error) throw error;
    
    return shows;
  } catch (error) {
    console.error('Error getting personalized show recommendations:', error);
    return [];
  }
};
