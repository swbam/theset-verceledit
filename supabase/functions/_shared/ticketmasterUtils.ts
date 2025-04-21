
import { retryableFetch } from './retry.ts'; // Assuming retry logic is moved/available
import type { Show, TicketmasterEvent, TicketmasterImage } from './types.ts';

// Helper function to map Ticketmaster event to our Show type
function mapTicketmasterEventToShow(event: TicketmasterEvent): Show {
    let imageUrl;
    if (event.images && event.images.length > 0) {
      const sortedImages = [...event.images].sort((a: TicketmasterImage, b: TicketmasterImage) => (b.width || 0) - (a.width || 0));
      imageUrl = sortedImages[0]?.url;
    }

    let artist = null;
    if (event._embedded?.attractions && event._embedded.attractions.length > 0) {
      const attraction = event._embedded.attractions[0];
      const artistImages = attraction.images || [];
      const sortedImages = [...artistImages].sort((a: TicketmasterImage, b: TicketmasterImage) => (b.width || 0) - (a.width || 0));
      
      const spotifyId = (attraction as any).externalLinks?.spotify?.[0]?.url?.split('/').pop();
      artist = {
        name: attraction.name,
        ticketmaster_id: attraction.id,
        image_url: sortedImages[0]?.url || undefined,
        spotify_id: spotifyId || undefined,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      console.log(`[EF mapTicketmasterEventToShow] Mapped artist: ${JSON.stringify(artist, null, 2)}`);
    } else {
      console.log(`[EF mapTicketmasterEventToShow] No attractions found for event: ${event.name}`);
    }

    let venue = null;
    if (event._embedded?.venues && event._embedded.venues.length > 0) {
      const venueData = event._embedded.venues[0];
      venue = {
        id: venueData.id,
        ticketmaster_id: venueData.id,
        name: venueData.name || 'Unknown Venue',
        city: venueData.city?.name,
        state: venueData.state?.name,
        country: venueData.country?.name,
        address: venueData.address?.line1,
        postal_code: venueData.postalCode,
        latitude: venueData.location?.latitude,
        longitude: venueData.location?.longitude,
        image_url: venueData.images?.[0]?.url,
        url: venueData.url,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
    }

    // Generate temporary UUIDs
    const showId = crypto.randomUUID();
    const artistId = artist ? crypto.randomUUID() : showId;
    const venueId = venue ? crypto.randomUUID() : showId;
    
    return {
      id: showId,
      name: event.name,
      ticketmaster_id: event.id,
      date: event.dates?.start?.dateTime || new Date().toISOString(),
      status: event.dates?.status?.code,
      url: event.url,
      image_url: imageUrl,
      ticket_url: event.url,
      popularity: 0,
      // Pass artist/venue objects for database saving
      artist: artist ? { ...artist, id: artistId } : undefined,
      venue: venue ? { ...venue, id: venueId } : undefined,
      // Use temporary IDs that will be replaced after saving artist/venue
      artist_id: artistId,
      venue_id: venueId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      last_updated: new Date().toISOString()
    };
}


/**
 * Fetch upcoming events for an artist by their Ticketmaster ID
 */
export async function fetchArtistEvents(artistTmId: string): Promise<Show[]> {
  try {
    if (!artistTmId) {
      console.warn("[EF fetchArtistEvents] No artist Ticketmaster ID provided.");
      return [];
    }

    // Use Deno.env for server-side API key access in Edge Functions
    const apiKey = Deno.env.get('TICKETMASTER_API_KEY');
    if (!apiKey) {
      console.error("[EF fetchArtistEvents] TICKETMASTER_API_KEY not configured in Edge Function environment variables.");
      throw new Error("Server configuration error: Missing Ticketmaster API Key.");
    }

    const response = await retryableFetch(async () => {
      const url = `https://app.ticketmaster.com/discovery/v2/events.json?apikey=${apiKey}&attractionId=${artistTmId}&size=50&sort=date,asc&includeTBA=yes&includeTBD=yes`;
      console.log(`[EF fetchArtistEvents] Requesting URL: ${url}`);

      const result = await fetch(url, {
        headers: { 
          'Accept': 'application/json',
          'Cache-Control': 'no-cache'
        }
      });

      if (!result.ok) {
        const errorBody = await result.text();
        console.error(`[EF fetchArtistEvents] Ticketmaster API error response: ${errorBody}`);
        
        // Handle rate limiting
        if (result.status === 429) {
          console.log('[EF fetchArtistEvents] Rate limited, waiting before retry...');
          await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
          throw new Error('Rate limited');
        }
        
        // Handle other common errors
        if (result.status === 404) {
          console.log(`[EF fetchArtistEvents] No events found for artist TM ID: ${artistTmId}`);
          return { _embedded: { events: [] } };
        }
        
        throw new Error(`Ticketmaster API error: ${result.status} ${result.statusText}`);
      }

      const data = await result.json();
      
      // Validate response structure
      if (!data || typeof data !== 'object') {
        throw new Error('Invalid response format from Ticketmaster API');
      }

      return data;
    }, { 
      retries: 5,
      delay: 1000 // 1 second delay between retries
    });

    console.log('[EF fetchArtistEvents] Raw API Response:', JSON.stringify(response, null, 2)); // Enable debugging

    if (!response._embedded?.events) {
      console.log(`[EF fetchArtistEvents] No _embedded.events found for artist TM ID: ${artistTmId}`);
      return [];
    }

    const events = response._embedded.events.map(mapTicketmasterEventToShow);
    console.log(`[EF fetchArtistEvents] Mapped ${events.length} events for artist TM ID: ${artistTmId}`);
    return events;

  } catch (error) {
    console.error(`[EF fetchArtistEvents] Error fetching events for artist TM ID ${artistTmId}:`, error);
    // Re-throw or return empty array depending on desired handling
    // Throwing makes the calling function aware of the failure.
    throw error;
  }
}

/**
 * Search for a Ticketmaster attraction (artist) by name.
 * Returns the first match or null.
 */
export async function searchTicketmasterArtistByName(artistName: string): Promise<{ id: string; name: string; url?: string } | null> {
  try {
    if (!artistName) {
      console.warn("[EF searchTmArtist] No artist name provided.");
      return null;
    }

    const apiKey = Deno.env.get('TICKETMASTER_API_KEY');
    if (!apiKey) {
      console.error("[EF searchTmArtist] TICKETMASTER_API_KEY not configured.");
      throw new Error("Server configuration error: Missing Ticketmaster API Key.");
    }

    const response = await retryableFetch(async () => {
      // Use keyword search for attractions
      const url = `https://app.ticketmaster.com/discovery/v2/attractions.json?apikey=${apiKey}&keyword=${encodeURIComponent(artistName)}&classificationName=music&size=1`;
      console.log(`[EF searchTmArtist] Requesting URL: ${url}`);

      const result = await fetch(url, {
        headers: { 'Accept': 'application/json' }
      });

      if (!result.ok) {
         const errorBody = await result.text();
         console.error(`[EF searchTmArtist] Ticketmaster API error response: ${errorBody}`);
         throw new Error(`Ticketmaster API error: ${result.status} ${result.statusText}`);
      }
      return result.json();
    }, { retries: 2 }); // Fewer retries for search

    if (!response._embedded?.attractions || response._embedded.attractions.length === 0) {
      console.log(`[EF searchTmArtist] No attractions found for name: ${artistName}`);
      return null;
    }

    const attraction = response._embedded.attractions[0];
    console.log(`[EF searchTmArtist] Found attraction: ${attraction.name} (ID: ${attraction.id})`);
    return {
      id: attraction.id,
      name: attraction.name,
      url: attraction.url,
    };

  } catch (error) {
    console.error(`[EF searchTmArtist] Error searching for artist '${artistName}':`, error);
    // Don't re-throw for search, just return null
    return null;
  }
}


/**
 * Fetch upcoming events for a venue by their Ticketmaster ID
 */
export async function fetchVenueEvents(venueTmId: string): Promise<Show[]> {
  try {
    if (!venueTmId) {
      console.warn('[EF fetchVenueEvents] No venue Ticketmaster ID provided.');
      return [];
    }

    const apiKey = Deno.env.get('TICKETMASTER_API_KEY');
    if (!apiKey) {
      console.error("[EF fetchVenueEvents] TICKETMASTER_API_KEY not configured in Edge Function environment variables.");
      throw new Error("Server configuration error: Missing Ticketmaster API Key.");
    }

    const response = await retryableFetch(async () => {
      const url = `https://app.ticketmaster.com/discovery/v2/events.json?apikey=${apiKey}&venueId=${venueTmId}&size=100&sort=date,asc`;
      console.log(`[EF fetchVenueEvents] Requesting URL: ${url}`);

      const result = await fetch(url, {
        headers: { 'Accept': 'application/json' }
      });

      if (!result.ok) {
        const errorBody = await result.text();
        console.error(`[EF fetchVenueEvents] Ticketmaster API error response: ${errorBody}`);
        throw new Error(`Ticketmaster API error: ${result.status} ${result.statusText}`);
      }
      return result.json();
    }, { retries: 3 });

    // console.log(`[EF fetchVenueEvents] Raw API Response for venue ${venueTmId}:`, response); // Optional: for debugging

    if (!response._embedded?.events) {
      console.log(`[EF fetchVenueEvents] No upcoming events found for venue TM ID: ${venueTmId}`);
      return [];
    }

    const events = response._embedded.events.map(mapTicketmasterEventToShow);
    console.log(`[EF fetchVenueEvents] Mapped ${events.length} events for venue TM ID: ${venueTmId}`);
    return events;

  } catch (error) {
    console.error(`[EF fetchVenueEvents] Error fetching events for venue TM ID ${venueTmId}:`, error);
    throw error; // Re-throw
  }
}

/**
 * Fetch trending shows from Ticketmaster
 * Returns a mix of popular upcoming shows across different genres
 */
export async function fetchTrendingShows(): Promise<Show[]> {
  try {
    const apiKey = Deno.env.get('TICKETMASTER_API_KEY');
    if (!apiKey) {
      console.error("[EF fetchTrendingShows] TICKETMASTER_API_KEY not configured.");
      throw new Error("Server configuration error: Missing Ticketmaster API Key.");
    }

    const response = await retryableFetch(async () => {
      // Get upcoming shows, sorted by relevance (Ticketmaster's popularity algorithm)
      const startDate = new Date().toISOString().split('T')[0]; // Just the date part
      const url = `https://app.ticketmaster.com/discovery/v2/events.json?apikey=${apiKey}&classificationName=music&size=50&sort=date,asc&startDateTime=${startDate}T00:00:00Z&countryCode=US&includeTBA=yes&includeTBD=yes&includeTest=no&includeFamily=no&includeAttractions=true&expand=attractions.id,attractions.name,attractions.images`;
      console.log(`[EF fetchTrendingShows] Requesting URL: ${url}`);

      const result = await fetch(url, {
        headers: { 'Accept': 'application/json' }
      });

      if (!result.ok) {
        const errorBody = await result.text();
        console.error(`[EF fetchTrendingShows] Ticketmaster API error response: ${errorBody}`);
        throw new Error(`Ticketmaster API error: ${result.status} ${result.statusText}`);
      }

      const data = await result.json();
      console.log('[EF fetchTrendingShows] Raw API Response:', JSON.stringify(data, null, 2));
      
      // Log the first event's attractions for debugging
      if (data._embedded?.events?.[0]?._embedded?.attractions) {
        console.log('[EF fetchTrendingShows] First event attractions:', 
          JSON.stringify(data._embedded.events[0]._embedded.attractions, null, 2));
      } else {
        console.log('[EF fetchTrendingShows] No attractions found in first event');
        // Add attractions parameter to URL and include embedded data
        const startDate = new Date().toISOString().split('T')[0];
        const url = `https://app.ticketmaster.com/discovery/v2/events.json?apikey=${apiKey}&classificationName=music&size=50&sort=date,asc&startDateTime=${startDate}T00:00:00Z&countryCode=US&includeAttractions=true&includeTBA=yes&includeTBD=yes&expand=attractions`;
        console.log(`[EF fetchTrendingShows] Retrying with attractions: ${url}`);
        
        const retryResult = await fetch(url, {
          headers: { 'Accept': 'application/json' }
        });

        if (!retryResult.ok) {
          const errorBody = await retryResult.text();
          console.error(`[EF fetchTrendingShows] Retry error response: ${errorBody}`);
          throw new Error(`Ticketmaster API error: ${retryResult.status} ${retryResult.statusText}`);
        }

        const retryData = await retryResult.json();
        console.log('[EF fetchTrendingShows] Retry API Response:', JSON.stringify(retryData, null, 2));
        
        // Log attractions from retry response
        if (retryData._embedded?.events?.[0]?._embedded?.attractions) {
          console.log('[EF fetchTrendingShows] First event attractions from retry:', 
            JSON.stringify(retryData._embedded.events[0]._embedded.attractions, null, 2));
        } else {
          console.log('[EF fetchTrendingShows] Still no attractions found in retry response');
        }
        
        return retryData;
      }
      
      return data;
    }, { retries: 3 });

    if (!response._embedded?.events) {
      console.log('[EF fetchTrendingShows] No trending events found');
      return [];
    }

    const events = response._embedded.events.map(mapTicketmasterEventToShow);
    console.log(`[EF fetchTrendingShows] Mapped ${events.length} trending events`);
    return events;

  } catch (error) {
    console.error('[EF fetchTrendingShows] Error fetching trending events:', error);
    throw error;
  }
}
