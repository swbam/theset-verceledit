import { retryableFetch } from '@/lib/retry';
import {
  saveShowToDatabase,
  saveArtistToDatabase,
  saveVenueToDatabase
} from './database-utils';
import type { Show } from '@/lib/types'; // Import Show from central types

// Define Venue structure locally if not imported or defined globally
interface Venue {
  id: string;
  name: string;
  city?: string;
  state?: string;
  country?: string;
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


// Removed duplicate/unused interface definitions for TicketmasterEvent and Venue

/**
 * Fetch upcoming events for an artist by their ID
 */
export async function fetchArtistEvents(artistId: string): Promise<Show[]> {
  try {
    if (!artistId) {
      return [];
    }

    // Use import.meta.env for client-side access in Vite
    const apiKey = import.meta.env.VITE_TICKETMASTER_API_KEY;
    if (!apiKey) {
      console.error("Ticketmaster API key not configured");
      return [];
    }

    const response = await retryableFetch(async () => {
      const url = `https://app.ticketmaster.com/discovery/v2/events.json?apikey=${apiKey}&attractionId=${artistId}&size=50&sort=date,asc`;
      console.log(`[fetchArtistEvents] Requesting URL: ${url}`); // Log the URL
      
      const result = await fetch(url, {
        headers: {
          'Accept': 'application/json'
        }
      });
      
      if (!result.ok) {
        throw new Error(`Ticketmaster API error: ${result.status} ${result.statusText}`);
      }
      
      return result.json();
    console.log('[fetchArtistEvents] Raw API Response:', response); // Log the raw response
    }, { retries: 3 });

    if (!response._embedded?.events) {
      console.log(`[fetchArtistEvents] No _embedded.events found for artistId: ${artistId}`);
      return [];
    }

    const events = response._embedded.events.map((event: { id: string; name: string; dates?: { start?: { dateTime: string } }; images?: Array<{ url: string; width?: number }>; url?: string; _embedded?: { attractions?: Array<{ id: string; name: string; images?: Array<{ url: string }> }>, venues?: Array<{ id: string; name: string; city?: { name: string }; state?: { name: string }; country?: { name: string } }> } }) => {
      // Get the best image
      let imageUrl;
      if (event.images && event.images.length > 0) {
        const sortedImages = [...event.images].sort((a, b) => (b.width || 0) - (a.width || 0));
        imageUrl = sortedImages[0]?.url;
      }

      // Extract artist information
      let artist = null;
      if (event._embedded?.attractions && event._embedded.attractions.length > 0) {
        const attraction = event._embedded.attractions[0];
        artist = {
          id: attraction.id,
          name: attraction.name,
          image_url: attraction.images?.[0]?.url // Use image_url
        };
      }

      // Extract venue information
      let venue = null;
      if (event._embedded?.venues && event._embedded.venues.length > 0) {
        const venueData = event._embedded.venues[0];
        venue = {
          id: venueData.id,
          name: venueData.name,
          city: venueData.city?.name,
          state: venueData.state?.name,
          country: venueData.country?.name
        };
      }

      return {
        id: event.id,
        name: event.name,
        date: event.dates?.start?.dateTime || new Date().toISOString(),
        ticket_url: event.url,
        image_url: imageUrl,
        artist_id: artist?.id,
        artist,
        venue_id: venue?.id,
        venue
        // Remove fields not part of the Show type: _embedded, dates, images, url
      };
    });

    return events;
  } catch (error) {
    console.error("Error fetching artist events:", error);
    return [];
  }
}

/**
 * Fetch upcoming events for a venue by their Ticketmaster ID (Server-side)
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
        // Log the error response body if possible
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

    // Map the response events to the Show type
    const events = response._embedded.events.map((event: TicketmasterEvent): Show => { // Use TicketmasterEvent type
      let imageUrl;
      if (event.images && event.images.length > 0) {
        // Use TicketmasterImage type for sorting
        const sortedImages = [...event.images].sort((a: TicketmasterImage, b: TicketmasterImage) => (b.width || 0) - (a.width || 0));
        imageUrl = sortedImages[0]?.url;
      }

      let artist = null;
      if (event._embedded?.attractions && event._embedded.attractions.length > 0) {
        const attraction = event._embedded.attractions[0];
        // Basic artist info - saveArtistToDatabase will enrich this later if needed
        artist = {
          id: attraction.id, // Ticketmaster ID for artist
          name: attraction.name,
          image_url: attraction.images?.[0]?.url
        };
      }

      let venue = null;
      if (event._embedded?.venues && event._embedded.venues.length > 0) {
        const venueData = event._embedded.venues[0];
        // Basic venue info - saveVenueToDatabase will enrich this later if needed
        venue = {
          id: venueData.id, // Ticketmaster ID for venue
          name: venueData.name,
          city: venueData.city?.name,
          state: venueData.state?.name,
          country: venueData.country?.name
        };
      }

      // Construct the Show object
      return {
        id: event.id, // Ticketmaster Event ID
        ticketmaster_id: event.id, // Explicitly store TM ID
        name: event.name,
        date: event.dates?.start?.dateTime || new Date().toISOString(),
        ticket_url: event.url,
        image_url: imageUrl,
        artist_id: artist?.id, // Ticketmaster Artist ID
        artist: artist, // Include nested artist object
        venue_id: venue?.id, // Ticketmaster Venue ID
        venue: venue, // Include nested venue object
        popularity: event.popularity || 0, // Include popularity if available
        // Ensure all required fields from Show type are present or optional
      };
    });

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

    const apiKey = import.meta.env.VITE_TICKETMASTER_API_KEY;
    if (!apiKey) {
      console.error("Ticketmaster API key not configured");
      return null;
    }

    const response = await retryableFetch(async () => {
      const url = `https://app.ticketmaster.com/discovery/v2/events/${showId}.json?apikey=${apiKey}`;
      
      const result = await fetch(url, {
        headers: {
          'Accept': 'application/json'
        }
      });
      
      if (!result.ok) {
        throw new Error(`Ticketmaster API error: ${result.status} ${result.statusText}`);
      }
      
      return result.json();
    }, { retries: 3 });

    if (!response || !response.id) {
      return null;
    }

    // Extract artist information
    let artist = null;
    if (response._embedded?.attractions && response._embedded.attractions.length > 0) {
      const attraction = response._embedded.attractions[0];
      artist = {
        id: attraction.id,
        name: attraction.name,
        image_url: attraction.images?.[0]?.url // Use image_url
      };
    }

    // Extract venue information
    let venue = null;
    if (response._embedded?.venues && response._embedded.venues.length > 0) {
      const venueData = response._embedded.venues[0];
      venue = {
        id: venueData.id,
        name: venueData.name,
        city: venueData.city?.name,
        state: venueData.state?.name,
        country: venueData.country?.name
      };
    }

    // Get the best image
    let imageUrl;
    if (response.images && response.images.length > 0) {
      const sortedImages = [...response.images].sort((a, b) => 
        (b.width || 0) - (a.width || 0)
      );
      
      imageUrl = sortedImages[0]?.url;
    }

    return {
      id: response.id,
      name: response.name,
      date: response.dates?.start?.dateTime || new Date().toISOString(),
      ticket_url: response.url,
      image_url: imageUrl,
      artist_id: artist?.id,
      artist,
      venue_id: venue?.id,
      venue
      // Remove fields not part of the Show type: _embedded, dates, images, url
    };
  } catch (error) {
    console.error("Error fetching show details:", error);
    return null;
  }
}

/**
 * Fetch venue details by ID
 */
export async function fetchVenueDetails(venueId: string): Promise<Venue | null> {
  try {
    if (!venueId) {
      return null;
    }

    const apiKey = import.meta.env.VITE_TICKETMASTER_API_KEY;
    if (!apiKey) {
      console.error("Ticketmaster API key not configured");
      return null;
    }

    const response = await retryableFetch(async () => {
      const url = `https://app.ticketmaster.com/discovery/v2/venues/${venueId}.json?apikey=${apiKey}`;
      
      const result = await fetch(url, {
        headers: {
          'Accept': 'application/json'
        }
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
      const sortedImages = [...response.images].sort((a, b) => 
        (b.width || 0) - (a.width || 0)
      );
      
      imageUrl = sortedImages[0]?.url;
    }

    return {
      id: response.id,
      name: response.name,
      city: response.city?.name,
      state: response.state?.name,
      country: response.country?.name,
      address: response.address?.line1,
      postalCode: response.postalCode,
      url: response.url,
      location: {
        latitude: response.location?.latitude,
        longitude: response.location?.longitude
      },
      images: response.images
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

    const apiKey = import.meta.env.VITE_TICKETMASTER_API_KEY;
    if (!apiKey) {
      console.error("Ticketmaster API key not configured");
      return [];
    }

    const response = await retryableFetch(async () => {
      const url = `https://app.ticketmaster.com/discovery/v2/events.json?apikey=${apiKey}&classificationName=${encodeURIComponent(genre)}&size=${size}&startDateTime=${fromDate}T00:00:00Z&sort=date,asc`;
      
      const result = await fetch(url, {
        headers: {
          'Accept': 'application/json'
        }
      });
      
      if (!result.ok) {
        throw new Error(`Ticketmaster API error: ${result.status} ${result.statusText}`);
      }
      
      return result.json();
    }, { retries: 3 });

    if (!response._embedded?.events) {
      return [];
    }

    const events = response._embedded.events.map((event: { id: string; name: string; dates?: { start?: { dateTime: string } }; images?: Array<{ url: string; width?: number }>; url?: string; _embedded?: { attractions?: Array<{ id: string; name: string; images?: Array<{ url: string }> }>, venues?: Array<{ id: string; name: string; city?: { name: string }; state?: { name: string }; country?: { name: string } }> } }) => {
      // Get the best image
      let imageUrl;
      if (event.images && event.images.length > 0) {
        const sortedImages = [...event.images].sort((a, b) => 
          (b.width || 0) - (a.width || 0)
        );
        
        imageUrl = sortedImages[0]?.url;
      }

      // Extract artist information
      let artist = null;
      if (event._embedded?.attractions && event._embedded.attractions.length > 0) {
        const attraction = event._embedded.attractions[0];
        artist = {
          id: attraction.id,
          name: attraction.name,
          image_url: attraction.images?.[0]?.url // Use image_url
        };
      }

      // Extract venue information
      let venue = null;
      if (event._embedded?.venues && event._embedded.venues.length > 0) {
        const venueData = event._embedded.venues[0];
        venue = {
          id: venueData.id,
          name: venueData.name,
          city: venueData.city?.name,
          state: venueData.state?.name,
          country: venueData.country?.name
        };
      }

      return {
        id: event.id,
        name: event.name,
        date: event.dates?.start?.dateTime || new Date().toISOString(),
        ticket_url: event.url,
        image_url: imageUrl,
        artist_id: artist?.id,
        artist,
        venue_id: venue?.id,
        venue
        // Remove fields not part of the Show type: _embedded, dates, images, url
      };
    });

    return events;
  } catch (error) {
    console.error("Error fetching shows by genre:", error);
    return [];
  }
}

/**
 * Fetch featured shows (popular upcoming events)
 */
/**
 * Sync all upcoming shows for a venue
 */
export async function syncVenueShows(venueId: string): Promise<void> {
  try {
    if (!venueId) {
      console.error("No venue ID provided for sync");
      return;
    }

    const apiKey = import.meta.env.VITE_TICKETMASTER_API_KEY;
    if (!apiKey) {
      console.error("Ticketmaster API key not configured");
      return;
    }

    // Fetch upcoming shows for this venue
    const response = await retryableFetch(async () => {
      const url = `https://app.ticketmaster.com/discovery/v2/events.json?apikey=${apiKey}&venueId=${venueId}&size=100&sort=date,asc`;
      
      const result = await fetch(url, {
        headers: {
          'Accept': 'application/json'
        }
      });
      
      if (!result.ok) {
        throw new Error(`Ticketmaster API error: ${result.status} ${result.statusText}`);
      }
      
      return result.json();
    }, { retries: 3 });

    if (!response._embedded?.events) {
      console.log(`No upcoming shows found for venue ${venueId}`);
      return;
    }

    // Process and save each show
    for (const event of response._embedded.events) {
      const show = {
        id: event.id,
        name: event.name,
        date: event.dates?.start?.dateTime || new Date().toISOString(),
        ticket_url: event.url,
        image_url: event.images?.[0]?.url,
        venue_id: venueId,
        _embedded: event._embedded,
        dates: event.dates,
        images: event.images,
        url: event.url
      };

      await saveShowToDatabase(show, true); // Pass true to indicate sync-triggered save
    }

    console.log(`Successfully synced ${response._embedded.events.length} shows for venue ${venueId}`);
  } catch (error) {
    console.error(`Error syncing shows for venue ${venueId}:`, error);
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
    const apiKey = import.meta.env.VITE_TICKETMASTER_API_KEY;
    if (!apiKey) {
      console.error("Invalid Ticketmaster API key configuration");
      return [];
    }

    // Fetch trending shows from Ticketmaster
    const shows = await fetchFeaturedShows(50); // Get more shows for better selection
    
    if (!shows || shows.length === 0) {
      console.log("No trending shows found from Ticketmaster");
      return [];
      console.log('[syncTrendingShows] Fetched featured shows:', shows);

    }
    
    console.log(`Fetched ${shows.length} trending shows from Ticketmaster`);

    // Save shows to database and collect saved shows
    const savedShows: Show[] = [];
    for (const show of shows) {
      try {
        // Process each show
        if (!show.id || !show.name) {
          console.log("Skipping invalid show:", show);
          continue;
        }
        
        // 1. Save artist if it exists
          console.log(`[syncTrendingShows] Calling saveArtistToDatabase for artist: ${show.artist.name} (ID: ${show.artist.id})`);

        let artistId = show.artist_id;
        if (show.artist && typeof show.artist === 'object') {
          const savedArtist = await saveArtistToDatabase(show.artist);
          artistId = savedArtist?.id || artistId;
          
          // If we have a valid artist with Spotify ID, fetch their songs
          if (savedArtist?.id && savedArtist?.spotify_id) {
            try {
              // Import dynamically to avoid circular dependencies
              const { fetchAndStoreArtistTracks } = await import('./database');
              await fetchAndStoreArtistTracks(
                savedArtist.id,
                savedArtist.spotify_id,
                savedArtist.name || "Unknown Artist"
              );
            } catch (songError) {
              console.error(`Error fetching songs for artist ${savedArtist.name}:`, songError);
            }
          }
        }
        
        // 2. Save venue if it exists
        let venueId = show.venue_id;
        if (show.venue && typeof show.venue === 'object') {
          const savedVenue = await saveVenueToDatabase(show.venue);
          venueId = savedVenue?.id || venueId;
        }
        
        // 3. Save the show with updated artist and venue IDs
        const showToSave = {
          ...show,
          artist_id: artistId,
          venue_id: venueId,
          // Set a high popularity for trending shows
          popularity: show.popularity || 100
        };
        
        const savedShow = await saveShowToDatabase(showToSave);
        if (savedShow) {
          savedShows.push(savedShow);
        }
      } catch (showError) {
        console.error(`Error processing show ${show.id}:`, showError);
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

export async function fetchFeaturedShows(size: number = 10): Promise<Show[]> {
  try {
    const apiKey = import.meta.env.VITE_TICKETMASTER_API_KEY;
    if (!apiKey) {
      console.error("Ticketmaster API key not configured");
      return [];
    }

    const response = await retryableFetch(async () => {
      const url = `https://app.ticketmaster.com/discovery/v2/events.json?apikey=${apiKey}&classificationName=music&size=${size}&sort=relevance,desc`;
      
      const result = await fetch(url, {
        headers: {
          'Accept': 'application/json'
        }
      });
      
      if (!result.ok) {
        throw new Error(`Ticketmaster API error: ${result.status} ${result.statusText}`);
      }
      
      return result.json();
      console.log('[fetchFeaturedShows] Raw Ticketmaster Response:', response);

    }, { retries: 3 });

    if (!response._embedded?.events) {
      console.log('[fetchFeaturedShows] No _embedded.events found.');

      return [];
    }

    const events = response._embedded.events.map((event) => { // Removed :TicketmasterEvent annotation
      // Get the best image
      let imageUrl;
      const venue = event._embedded?.venues?.[0];
      const artist = event._embedded?.attractions?.[0];
      
      const show: Show = {
        id: event.id,
        name: event.name,
        date: event.dates?.start?.dateTime || new Date().toISOString(),
        ticket_url: event.url,
        image_url: imageUrl,
        venue_id: venue?.id,
        artist_id: artist?.id,
        popularity: 0,
        artist: artist ? {
          id: artist.id,
          name: artist.name,
          image_url: artist.images?.[0]?.url // Use image_url
        } : undefined,
        venue: venue ? {
          id: venue.id,
          name: venue.name,
          city: venue.city?.name,
          state: venue.state?.name,
          country: venue.country?.name
        } : undefined
      };
      if (event.images && event.images.length > 0) {
        const sortedImages = [...event.images].sort((a, b) => 
          (b.width || 0) - (a.width || 0)
        );
        
        imageUrl = sortedImages[0]?.url;
      }

      return {
        id: event.id,
        name: event.name,
        date: event.dates?.start?.dateTime || new Date().toISOString(),
        ticket_url: event.url,
        image_url: imageUrl
        // Remove fields not part of the Show type: _embedded, dates, images, url
      };
    });

    return events;
    console.log(`[fetchFeaturedShows] Mapped ${events.length} events.`);

  } catch (error) {
    console.error("Error fetching featured shows:", error);
    return [];
  }
}
