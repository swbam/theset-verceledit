import { retryableFetch } from '@/lib/retry';
import {
  saveShowToDatabase,
  saveArtistToDatabase,
  saveVenueToDatabase
} from './database-utils';
import type { Show, Artist, Venue as AppVenue } from '@/lib/types'; // Use AppVenue alias for clarity

// Define Venue structure locally if not imported or defined globally
// This represents the structure expected by fetchVenueDetails return
interface VenueDetails extends AppVenue {
  address?: string;
  postalCode?: string;
  url?: string;
  location?: {
    latitude?: string;
    longitude?: string;
  };
  images?: Array<{
    url: string;
    ratio?: string;
    width?: number;
  }>;
}


// Type for Ticketmaster Image object
interface TicketmasterImage {
  url: string;
  ratio?: string;
  width?: number;
  height?: number;
  fallback?: boolean;
}

// Type for the raw event object from Ticketmaster API response
interface TicketmasterEvent {
  id: string;
  name: string;
  url?: string;
  dates?: {
    start?: {
      dateTime?: string;
      localDate?: string;
      localTime?: string;
    };
    timezone?: string;
    status?: {
      code?: string;
    };
  };
  images?: TicketmasterImage[];
  popularity?: number; // Assuming popularity might exist
  _embedded?: {
    venues?: Array<{
      id: string;
      name: string;
      city?: { name: string };
      state?: { name: string };
      country?: { name: string; countryCode?: string };
      address?: { line1?: string };
      postalCode?: string;
      location?: { latitude?: string; longitude?: string };
      url?: string;
      images?: TicketmasterImage[];
      // Add other venue fields if needed
    }>;
    attractions?: Array<{
      id: string;
      name: string;
      images?: TicketmasterImage[];
      // Add other attraction fields if needed
    }>;
  };
  // Add other potential fields from the event object if needed
}

// Helper function to map Ticketmaster event to our Show type
function mapTicketmasterEventToShow(event: TicketmasterEvent): Show {
    let imageUrl;
    if (event.images && event.images.length > 0) {
      const sortedImages = [...event.images].sort((a, b) => (b.width || 0) - (a.width || 0));
      imageUrl = sortedImages[0]?.url;
    }

    let artist: Artist | null = null;
    if (event._embedded?.attractions && event._embedded.attractions.length > 0) {
      const attraction = event._embedded.attractions[0];
      artist = {
        id: attraction.id, // Ticketmaster ID for artist
        name: attraction.name,
        image_url: attraction.images?.[0]?.url
        // Other fields like spotify_id will be populated later if needed
      };
    }

    let venue: AppVenue | null = null;
    if (event._embedded?.venues && event._embedded.venues.length > 0) {
      const venueData = event._embedded.venues[0];
      venue = {
        id: venueData.id, // Ticketmaster ID for venue
        ticketmaster_id: venueData.id, // Store TM ID explicitly
        name: venueData.name,
        city: venueData.city?.name,
        state: venueData.state?.name,
        country: venueData.country?.name,
        address: venueData.address?.line1,
        postal_code: venueData.postalCode,
        image_url: venueData.images?.[0]?.url,
        // location and url might be available depending on TM response structure for events
      };
    }

    return {
      id: event.id, // Ticketmaster Event ID
      ticketmaster_id: event.id, // Explicitly store TM ID
      name: event.name,
      date: event.dates?.start?.dateTime || new Date().toISOString(), // Fallback needed
      ticket_url: event.url,
      image_url: imageUrl,
      artist_id: artist?.id, // Ticketmaster Artist ID
      artist: artist || undefined, // Include nested artist object or undefined
      venue_id: venue?.id, // Ticketmaster Venue ID
      venue: venue || undefined, // Include nested venue object or undefined
      popularity: event.popularity || 0,
      // Ensure all required fields from Show type are present or optional
    };
}


/**
 * Fetch upcoming events for an artist by their ID
 */
export async function fetchArtistEvents(artistId: string): Promise<Show[]> {
  try {
    if (!artistId) {
      return [];
    }

    // Use import.meta.env for client-side access in Vite (if called client-side)
    // Use process.env for server-side access (if called server-side)
    const apiKey = import.meta.env.VITE_TICKETMASTER_API_KEY || process.env.TICKETMASTER_API_KEY;
    if (!apiKey) {
      console.error("Ticketmaster API key not configured");
      return [];
    }

    const response = await retryableFetch(async () => {
      const url = `https://app.ticketmaster.com/discovery/v2/events.json?apikey=${apiKey}&attractionId=${artistId}&size=50&sort=date,asc`;
      console.log(`[fetchArtistEvents] Requesting URL: ${url}`);

      const result = await fetch(url, {
        headers: { 'Accept': 'application/json' }
      });

      if (!result.ok) {
        throw new Error(`Ticketmaster API error: ${result.status} ${result.statusText}`);
      }
      return result.json();
    }, { retries: 3 });

    console.log('[fetchArtistEvents] Raw API Response:', response);

    if (!response._embedded?.events) {
      console.log(`[fetchArtistEvents] No _embedded.events found for artistId: ${artistId}`);
      return [];
    }

    const events = response._embedded.events.map(mapTicketmasterEventToShow);
    return events;

  } catch (error) {
    console.error("Error fetching artist events:", error);
    return [];
  }
}

/**
 * Fetch upcoming events for a venue by their Ticketmaster ID (Server-side)
 * This function focuses *only* on fetching and mapping, not saving.
 */
export async function fetchVenueEvents(venueTmId: string): Promise<Show[]> {
  try {
    if (!venueTmId) {
      console.warn('[fetchVenueEvents] No venue Ticketmaster ID provided.');
      return [];
    }

    // Use process.env for server-side API key access
    const apiKey = process.env.TICKETMASTER_API_KEY;
    if (!apiKey) {
      console.error("[fetchVenueEvents] TICKETMASTER_API_KEY not configured in server environment variables");
      return []; // Or throw an error
    }

    const response = await retryableFetch(async () => {
      // Fetch events for the specific venue, sorted by date
      const url = `https://app.ticketmaster.com/discovery/v2/events.json?apikey=${apiKey}&venueId=${venueTmId}&size=100&sort=date,asc`;
      console.log(`[fetchVenueEvents] Requesting URL: ${url}`);

      const result = await fetch(url, {
        headers: { 'Accept': 'application/json' }
      });

      if (!result.ok) {
        const errorBody = await result.text();
        console.error(`[fetchVenueEvents] Ticketmaster API error response: ${errorBody}`);
        throw new Error(`Ticketmaster API error: ${result.status} ${result.statusText}`);
      }
      return result.json();
    }, { retries: 3 });

    if (!response._embedded?.events) {
      console.log(`[fetchVenueEvents] No upcoming events found for venue TM ID: ${venueTmId}`);
      return [];
    }

    console.log(`[fetchVenueEvents] Raw API Response for venue ${venueTmId}:`, response);

    // Map the response events to the Show type using the helper
    const events = response._embedded.events.map(mapTicketmasterEventToShow);

    console.log(`[fetchVenueEvents] Mapped ${events.length} events for venue TM ID: ${venueTmId}`);
    return events;

  } catch (error) {
    console.error(`[fetchVenueEvents] Error fetching events for venue TM ID ${venueTmId}:`, error);
    return []; // Return empty array on error
  }
}


/**
 * Fetch details for a specific show by ID
 */
export async function fetchShowDetails(showId: string): Promise<Show | null> {
  try {
    if (!showId) {
      return null;
    }

    const apiKey = import.meta.env.VITE_TICKETMASTER_API_KEY || process.env.TICKETMASTER_API_KEY;
    if (!apiKey) {
      console.error("Ticketmaster API key not configured");
      return null;
    }

    const response: TicketmasterEvent = await retryableFetch(async () => {
      const url = `https://app.ticketmaster.com/discovery/v2/events/${showId}.json?apikey=${apiKey}`;
      const result = await fetch(url, {
        headers: { 'Accept': 'application/json' }
      });
      if (!result.ok) {
        throw new Error(`Ticketmaster API error: ${result.status} ${result.statusText}`);
      }
      return result.json();
    }, { retries: 3 });

    if (!response || !response.id) {
      return null;
    }

    // Map using the helper function
    return mapTicketmasterEventToShow(response);

  } catch (error) {
    console.error("Error fetching show details:", error);
    return null;
  }
}

/**
 * Fetch venue details by ID
 */
export async function fetchVenueDetails(venueId: string): Promise<VenueDetails | null> {
  try {
    if (!venueId) {
      return null;
    }

    const apiKey = import.meta.env.VITE_TICKETMASTER_API_KEY || process.env.TICKETMASTER_API_KEY;
    if (!apiKey) {
      console.error("Ticketmaster API key not configured");
      return null;
    }

    const response = await retryableFetch(async () => {
      const url = `https://app.ticketmaster.com/discovery/v2/venues/${venueId}.json?apikey=${apiKey}`;
      const result = await fetch(url, {
        headers: { 'Accept': 'application/json' }
      });
      if (!result.ok) {
        throw new Error(`Ticketmaster API error: ${result.status} ${result.statusText}`);
      }
      return result.json();
    }, { retries: 3 });

    if (!response || !response.id) {
      return null;
    }

    // Get the best image
    let imageUrl;
    if (response.images && response.images.length > 0) {
      const sortedImages = [...response.images].sort((a: TicketmasterImage, b: TicketmasterImage) =>
        (b.width || 0) - (a.width || 0)
      );
      imageUrl = sortedImages[0]?.url;
    }

    // Map to our VenueDetails type (which extends AppVenue)
    return {
      id: response.id,
      ticketmaster_id: response.id, // Store TM ID explicitly
      name: response.name,
      city: response.city?.name,
      state: response.state?.name,
      country: response.country?.name,
      address: response.address?.line1,
      postal_code: response.postalCode,
      url: response.url,
      image_url: imageUrl, // Add image_url
      location: {
        latitude: response.location?.latitude,
        longitude: response.location?.longitude
      },
      images: response.images // Keep original images array if needed elsewhere
    };
  } catch (error) {
    console.error("Error fetching venue details:", error);
    return null;
  }
}

/**
 * Fetch shows by music genre
 */
export async function fetchShowsByGenre(
  genre: string,
  size: number = 20,
  fromDate: string = new Date().toISOString().split('T')[0]
): Promise<Show[]> {
  try {
    if (!genre) {
      return [];
    }

    const apiKey = import.meta.env.VITE_TICKETMASTER_API_KEY || process.env.TICKETMASTER_API_KEY;
    if (!apiKey) {
      console.error("Ticketmaster API key not configured");
      return [];
    }

    const response = await retryableFetch(async () => {
      const url = `https://app.ticketmaster.com/discovery/v2/events.json?apikey=${apiKey}&classificationName=${encodeURIComponent(genre)}&size=${size}&startDateTime=${fromDate}T00:00:00Z&sort=date,asc`;
      const result = await fetch(url, {
        headers: { 'Accept': 'application/json' }
      });
      if (!result.ok) {
        throw new Error(`Ticketmaster API error: ${result.status} ${result.statusText}`);
      }
      return result.json();
    }, { retries: 3 });

    if (!response._embedded?.events) {
      return [];
    }

    // Map using the helper function
    const events = response._embedded.events.map(mapTicketmasterEventToShow);
    return events;

  } catch (error) {
    console.error("Error fetching shows by genre:", error);
    return [];
  }
}


/**
 * Fetch featured shows (popular upcoming music events)
 */
export async function fetchFeaturedShows(size: number = 10): Promise<Show[]> {
  try {
    const apiKey = import.meta.env.VITE_TICKETMASTER_API_KEY || process.env.TICKETMASTER_API_KEY;
    if (!apiKey) {
      console.error("Ticketmaster API key not configured");
      return [];
    }

    const response = await retryableFetch(async () => {
      // Fetch music events, sorted by relevance/popularity
      const url = `https://app.ticketmaster.com/discovery/v2/events.json?apikey=${apiKey}&classificationName=music&size=${size}&sort=relevance,desc`;
      const result = await fetch(url, {
        headers: { 'Accept': 'application/json' }
      });
      if (!result.ok) {
        throw new Error(`Ticketmaster API error: ${result.status} ${result.statusText}`);
      }
      return result.json();
    }, { retries: 3 });

    console.log('[fetchFeaturedShows] Raw Ticketmaster Response:', response);

    if (!response._embedded?.events) {
      console.log('[fetchFeaturedShows] No _embedded.events found.');
      return [];
    }

    // Map using the helper function
    const events = response._embedded.events.map(mapTicketmasterEventToShow);

    console.log(`[fetchFeaturedShows] Mapped ${events.length} events.`);
    return events;

  } catch (error) {
    console.error("Error fetching featured shows:", error);
    return [];
  }
}


/**
 * Sync trending shows and save to database
 * This function fetches trending shows from Ticketmaster and saves them to the database
 * with all related data (artists, venues, songs, setlists)
 */
export async function syncTrendingShows(): Promise<Show[]> {
  try {
    console.log("Starting trending shows sync...");

    // Fetch trending shows using the dedicated function
    const shows = await fetchFeaturedShows(50); // Get more shows for better selection

    if (!shows || shows.length === 0) {
      console.log("No trending shows found from Ticketmaster");
      return [];
    }

    console.log(`Fetched ${shows.length} trending shows from Ticketmaster`);

    // Save shows to database and collect saved shows
    const savedShows: Show[] = [];
    for (const show of shows) {
      try {
        // Process each show using saveShowToDatabase which handles dependencies
        if (!show || !show.id || !show.name) {
          console.warn("[syncTrendingShows] Skipping invalid show data:", show);
          continue;
        }

        // saveShowToDatabase handles saving artist and venue if they are included in the show object
        // It also handles creating the setlist and initial songs
        const savedShow = await saveShowToDatabase(show); // Pass the mapped Show object

        if (savedShow) {
          // Optionally enrich the savedShow object if needed before pushing
          savedShows.push(savedShow);
        } else {
           console.warn(`[syncTrendingShows] Failed to save show ${show.name} (ID: ${show.id}) during sync.`);
        }
      } catch (showError) {
        console.error(`[syncTrendingShows] Error processing show ${show.id} (${show.name}):`, showError);
        // Continue with next show
      }
    }

    console.log(`Successfully synced ${savedShows.length} trending shows to database`);
    return savedShows;
  } catch (error) {
    console.error("Error syncing trending shows:", error);
    return [];
  }
}
