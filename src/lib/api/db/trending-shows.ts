import { supabase } from '@/lib/supabase';

/**
 * Fetch trending shows from the database
 * @param limit Number of shows to fetch
 * @returns Array of trending shows
 */
export async function fetchTrendingShowsFromDB(limit: number = 10) {
  try {
    console.log('Fetching trending shows from database');
    
    // Query shows from the database
    // Order by date (ascending) and only include future shows
    const { data: shows, error } = await supabase
      .from('shows')
      .select(`
        *,
        artist:artist_id (*),
        venue:venue_id (*)
      `)
      .order('date', { ascending: true })
      .gte('date', new Date().toISOString())
      .limit(limit);
    
    if (error) {
      console.error('Error fetching trending shows from database:', error);
      return [];
    }
    
    if (!shows || shows.length === 0) {
      console.log('No trending shows found in database');
      return [];
    }
    
    // Map database shows to the format expected by the UI
    return shows.map(show => ({
      id: show.id,
      name: show.name,
      date: show.date,
      image_url: show.image_url,
      ticket_url: show.ticket_url,
      artist: show.artist ? {
        id: show.artist.id,
        name: show.artist.name,
        image: show.artist.image_url
      } : undefined,
      venue: show.venue ? {
        id: show.venue.id,
        name: show.venue.name,
        city: show.venue.city,
        state: show.venue.state,
        country: show.venue.country
      } : undefined,
      vote_count: 0 // Default value, can be updated with actual vote counts if available
    }));
  } catch (error) {
    console.error('Error in fetchTrendingShowsFromDB:', error);
    return [];
  }
}