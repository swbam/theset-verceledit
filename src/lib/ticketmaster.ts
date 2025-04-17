import { supabase } from '@/integrations/supabase/client';
import { callTicketmasterApi, popularMusicGenres } from './api/ticketmaster-config';

export { popularMusicGenres };

// Artist related functions
export { 
  searchArtistsWithEvents, 
  fetchFeaturedArtists,
  fetchArtistById
} from './api/artist';

// Show related functions (Client-side safe subset)
export async function fetchShowDetails(showId: string) {
  try {
    // First try to get from Supabase
    const { data: show, error } = await supabase
      .from('shows')
      .select(`
        *,
        artist:artists(*),
        venue:venues(*)
      `)
      .eq('id', showId)
      .single();

    if (error) throw error;

    // Trigger background sync
    supabase.functions.invoke('sync-show', {
      body: { showId }
    }).catch(error => {
      console.error(`Background sync failed for show ${showId}:`, error);
    });

    return show;
  } catch (error) {
    console.error('[API/shows] Error fetching show details:', error);
    return null;
  }
}

export async function fetchShowsByGenre(genre: string) {
  try {
    const data = await callTicketmasterApi('events.json', {
      classificationName: 'music',
      genreId: genre,
      size: '20'
    });

    if (!data._embedded?.events) {
      return [];
    }

    return data._embedded.events.map((event: any) => ({
      id: event.id,
      name: event.name,
      date: event.dates.start.dateTime,
      venue: event._embedded?.venues?.[0] ? {
        id: event._embedded.venues[0].id,
        name: event._embedded.venues[0].name,
        city: event._embedded.venues[0].city?.name,
        state: event._embedded.venues[0].state?.name,
        country: event._embedded.venues[0].country?.name
      } : null,
      ticket_url: event.url,
      image_url: event.images?.find((img: any) => img.ratio === "16_9" && img.width > 500)?.url,
      artist_id: event._embedded?.attractions?.[0]?.id
    }));
  } catch (error) {
    console.error('[API/shows] Error fetching shows by genre:', error);
    return [];
  }
}

// Import and re-export from the shows directory
export { fetchArtistEvents } from './api/shows/artist-events';
export { fetchFeaturedShows } from './api/shows/featured-shows';

// Removed export for './api/shows' as the file was deleted (logic moved to Edge Functions)
// Removed export for database-utils as the file was deleted (logic moved to Edge Functions)
// Setlist.fm related functions
export const fetchPastSetlists = async (artistId: string, artistName: string) => {
  try {
    // Directly return hardcoded past setlists data as fallback
    return [];
  } catch (error) {
    console.error("Error in fetchPastSetlists:", error);
    return [];
  }
};
