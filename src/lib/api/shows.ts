import { retryableFetch } from '@/lib/retry';

interface Show {
  id: string;
  name: string;
  date: string;
  ticket_url?: string;
  image_url?: string;
  artist_id?: string; // Added artist_id property
  venue_id?: string; // Added venue_id property
  venue?: {
    id: string;
    name: string;
    city?: string;
    state?: string;
    country?: string;
  }; // Added venue property
  artist?: {
    id: string;
    name: string;
    image?: string;
  }; // Added artist property
  _embedded?: {
    attractions?: Array<{
      id: string;
      name: string;
      images?: Array<{ url: string }>;
    }>;
    venues?: Array<{
      id: string;
      name: string;
      city?: { name: string };
      state?: { name: string };
      country?: { name: string };
    }>;
  };
  dates?: {
    start?: {
      dateTime: string;
      localDate?: string;
    };
  };
  images?: Array<{
    url: string;
    ratio?: string;
    width?: number;
  }>;
  url?: string;
}

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

/**
 * Fetch upcoming events for an artist by their ID
 */
export async function fetchArtistEvents(artistId: string): Promise<Show[]> {
  try {
    if (!artistId) {
      return [];
    }

    const apiKey = process.env.NEXT_PUBLIC_TICKETMASTER_API_KEY || process.env.TICKETMASTER_API_KEY;
    if (!apiKey) {
      console.error("Ticketmaster API key not configured");
      return [];
    }

    const response = await retryableFetch(async () => {
      const url = `https://app.ticketmaster.com/discovery/v2/events.json?apikey=${apiKey}&attractionId=${artistId}&size=50&sort=date,asc`;
      
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
          image: attraction.images?.[0]?.url
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
        venue,
        _embedded: event._embedded,
        dates: event.dates,
        images: event.images,
        url: event.url
      };
    });

    return events;
  } catch (error) {
    console.error("Error fetching artist events:", error);
    return [];
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

    const apiKey = process.env.NEXT_PUBLIC_TICKETMASTER_API_KEY || process.env.TICKETMASTER_API_KEY;
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
        image: attraction.images?.[0]?.url
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
      venue,
      _embedded: response._embedded,
      dates: response.dates,
      images: response.images,
      url: response.url
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

    const apiKey = process.env.NEXT_PUBLIC_TICKETMASTER_API_KEY || process.env.TICKETMASTER_API_KEY;
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

    const apiKey = process.env.NEXT_PUBLIC_TICKETMASTER_API_KEY || process.env.TICKETMASTER_API_KEY;
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
          image: attraction.images?.[0]?.url
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
        venue,
        _embedded: event._embedded,
        dates: event.dates,
        images: event.images,
        url: event.url
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
export async function fetchFeaturedShows(size: number = 10): Promise<Show[]> {
  try {
    const apiKey = process.env.NEXT_PUBLIC_TICKETMASTER_API_KEY || process.env.TICKETMASTER_API_KEY;
    if (!apiKey) {
      console.error("Ticketmaster API key not configured");
      return [];
    }

    const response = await retryableFetch(async () => {
      const url = `https://app.ticketmaster.com/discovery/v2/events.json?apikey=${apiKey}&classificationName=music&size=${size}&sort=popularity,desc`;
      
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

      return {
        id: event.id,
        name: event.name,
        date: event.dates?.start?.dateTime || new Date().toISOString(),
        ticket_url: event.url,
        image_url: imageUrl,
        _embedded: event._embedded,
        dates: event.dates,
        images: event.images,
        url: event.url
      };
    });

    return events;
  } catch (error) {
    console.error("Error fetching featured shows:", error);
    return [];
  }
}
