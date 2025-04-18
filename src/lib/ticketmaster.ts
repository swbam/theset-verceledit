import { supabase } from '@/integrations/supabase/client';
import { callTicketmasterApi, popularMusicGenres } from './api/ticketmaster-config';
import { createClient } from '@supabase/supabase-js';

interface Image {
  url: string;
  width: number;
  height: number;
  ratio?: string;
}

function getBestImage(images?: Image[]): string | null {
  if (!images || images.length === 0) return null;
  
  // First try to find a 16:9 image with width > 500
  const wideImage = images.find(img => img.ratio === "16_9" && img.width > 500);
  if (wideImage) return wideImage.url;
  
  // Otherwise get the largest image
  const sorted = [...images].sort((a, b) => (b.width || 0) - (a.width || 0));
  return sorted[0].url;
}

export { popularMusicGenres };

// Directly import the artist-related functions except for fetchFeaturedArtists
export { 
  searchArtistsWithEvents,
  fetchArtistById
} from './api/artist';

// Updated: Use the serverless API endpoint for featured artists
export async function fetchFeaturedArtists() {
  try {
    console.log('[fetchFeaturedArtists] Fetching featured artists from API...');
    const response = await fetch('/api/featured-artists');
    
    if (!response.ok) {
      const error = await response.text();
      console.error('[fetchFeaturedArtists] API error:', error);
      return [];
    }
    
    const artists = await response.json();
    console.log(`[fetchFeaturedArtists] Successfully fetched ${artists.length} featured artists`);
    return artists;
  } catch (error) {
    console.error('[fetchFeaturedArtists] Error:', error);
    return [];
  }
}

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

    if (error) {
      if (error.code === 'PGRST116') { // Record not found
        // Trigger sync and wait for it
        const { error: syncError } = await supabase.functions.invoke('sync-show', {
          body: { showId }
        });

        if (syncError) throw syncError;

        // Try fetching again after sync
        const { data: syncedShow, error: refetchError } = await supabase
          .from('shows')
          .select(`
            *,
            artist:artists(*),
            venue:venues(*)
          `)
          .eq('id', showId)
          .single();

        if (refetchError) throw refetchError;
        return syncedShow;
      }
      throw error;
    }

    // If show exists but might be stale, trigger background sync
    if (show) {
      const lastUpdated = new Date(show.updated_at || show.created_at || new Date());
      const now = new Date();
      const hoursSinceUpdate = (now.getTime() - lastUpdated.getTime()) / (1000 * 60 * 60);

      if (hoursSinceUpdate > 24) {
        // Trigger background sync if data is older than 24 hours
        supabase.functions.invoke('sync-show', {
          body: { showId }
        }).catch(error => {
          console.error(`Background sync failed for show ${showId}:`, error);
        });
      }
    }

    return show;
  } catch (error) {
    console.error('[API/shows] Error fetching show details:', error);
    throw error; // Let the UI handle the error
  }
}

export async function fetchShowsByGenre(genre: string): Promise<any[]> {
  try {
    const data = await callTicketmasterApi('events.json', {
      classificationName: 'music',
      genreId: genre,
      size: '20'
    });

    if (!data || !data._embedded) {
      console.log(`No events found for genre: ${genre}`);
      return [];
    }

    const shows = data._embedded.events
      .filter((event: any) => {
        // Ensure event has required data
        return event && 
               event._embedded?.attractions?.[0] &&
               event._embedded?.venues?.[0];
      })
      .map((event: any) => ({
        id: event.id,
        name: event.name,
        date: event.dates?.start?.dateTime ? new Date(event.dates.start.dateTime).toISOString() : null,
        artist: {
          id: event._embedded.attractions[0].id,
          name: event._embedded.attractions[0].name
        },
        venue: {
          id: event._embedded.venues[0].id,
          name: event._embedded.venues[0].name
        },
        ticketUrl: event.url || null,
        imageUrl: getBestImage(event.images) || null,
        popularity: event.popularity || null
      }));

    return shows;
  } catch (error) {
    console.error('Error fetching shows by genre:', error);
    throw error;
  }
}

// Import and re-export from the shows directory
export { fetchArtistEvents } from './api/shows/artist-events';
export { fetchFeaturedShows } from './api/shows/featured-shows';

// Removed export for './api/shows' as the file was deleted (logic moved to Edge Functions)
// Removed export for database-utils as the file was deleted (logic moved to Edge Functions)
// Setlist.fm related functions
export const fetchPastSetlists = async () => {
  try {
    // Directly return hardcoded past setlists data as fallback
    return [];
  } catch (error) {
    console.error("Error in fetchPastSetlists:", error);
    return [];
  }
};

export async function syncArtist(artistId: string, artistName: string): Promise<void> {
  try {
    const supabase = createClient(
      import.meta.env.VITE_SUPABASE_URL,
      import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY
    );

    // Check if artist exists
    const { data: existingArtist, error: existingError } = await supabase
      .from('artists')
      .select('*')
      .eq('ticketmaster_id', artistId)
      .single();

    if (existingError && existingError.code !== 'PGRST116') {
      throw existingError;
    }

    if (!existingArtist) {
      // Insert new artist
      const { error: insertError } = await supabase
        .from('artists')
        .insert({
          ticketmaster_id: artistId,
          name: artistName,
          updated_at: new Date().toISOString()
        });

      if (insertError) throw insertError;
    }
  } catch (error) {
    console.error(`Error syncing artist ${artistName} (${artistId}):`, error);
    throw error;
  }
}
