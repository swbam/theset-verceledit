// Re-export all functions from the different modules
export { 
  popularMusicGenres,
  getTrendingConcerts
} from './api/ticketmaster-config';

/**
 * Fetch trending shows from Ticketmaster
 * @param limit Number of shows to fetch
 * @returns Array of trending shows
 */
export async function fetchTrendingShows(limit: number = 10) {
  try {
    const apiKey = import.meta.env.VITE_TICKETMASTER_API_KEY || 'k8GrSAkbFaN0w7qDxGl7ohr8LwdAQm9b';
    const url = `https://app.ticketmaster.com/discovery/v2/events.json?classificationName=music&size=${limit}&sort=relevance,desc&apikey=${apiKey}`;
    
    console.log('Fetching trending shows from Ticketmaster');
    
    const response = await fetch(url);
    
    if (!response.ok) {
      console.error(`Ticketmaster API error: ${response.status}`);
      return [];
    }
    
    const data = await response.json() as TicketmasterEventsResponse;
    
    if (!data._embedded?.events || data._embedded.events.length === 0) {
      console.log('No trending shows found');
      return [];
    }
    
    // Map events to a more usable format
    return data._embedded.events.map(event => {
      const venue = event._embedded?.venues?.[0] || {} as TicketmasterVenue;
      const attraction = event._embedded?.attractions?.[0] || {} as TicketmasterAttraction;
      
      return {
        id: event.id,
        name: event.name,
        date: event.dates.start.dateTime,
        status: event.dates.status?.code,
        url: event.url,
        image: event.images?.find(img => img.ratio === '16_9')?.url || event.images?.[0]?.url,
        venue: {
          id: venue.id,
          name: venue.name,
          city: venue.city?.name,
          state: venue.state?.name,
          country: venue.country?.name,
          address: venue.address?.line1,
          location: {
            latitude: venue.location?.latitude,
            longitude: venue.location?.longitude,
          },
        },
        artist: attraction ? {
          id: attraction.id,
          name: attraction.name,
          image: attraction.images?.find(img => img.ratio === '16_9')?.url || attraction.images?.[0]?.url,
        } : undefined
      };
    });
  } catch (error) {
    console.error('Error fetching trending shows:', error);
    return [];
  }
}

/**
 * Fetch upcoming shows from Ticketmaster with optional genre filtering
 * @param genre Optional genre to filter by
 * @param limit Number of shows to fetch
 * @returns Array of upcoming shows
 */
export async function fetchUpcomingShows(genre?: string, limit: number = 10) {
  try {
    const apiKey = import.meta.env.VITE_TICKETMASTER_API_KEY || 'k8GrSAkbFaN0w7qDxGl7ohr8LwdAQm9b';
    
    // Build the URL with appropriate parameters
    let url = `https://app.ticketmaster.com/discovery/v2/events.json?classificationName=music&size=${limit}&sort=date,asc&apikey=${apiKey}`;
    
    // Add genre filter if provided
    if (genre) {
      url += `&genreId=${genre}`;
    }
    
    console.log(`Fetching upcoming shows${genre ? ` for genre: ${genre}` : ''}, limit: ${limit}`);
    
    const response = await fetch(url);
    
    if (!response.ok) {
      console.error(`Ticketmaster API error: ${response.status}`);
      return [];
    }
    
    const data = await response.json() as TicketmasterEventsResponse;
    
    if (!data._embedded?.events || data._embedded.events.length === 0) {
      console.log('No upcoming shows found');
      return [];
    }
    
    // Map events to a more usable format
    return data._embedded.events.map(event => {
      const venue = event._embedded?.venues?.[0] || {} as TicketmasterVenue;
      const attraction = event._embedded?.attractions?.[0] || {} as TicketmasterAttraction;
      
      return {
        id: event.id,
        name: event.name,
        date: event.dates.start.dateTime,
        status: event.dates.status?.code,
        url: event.url,
        ticket_url: event.url,
        image: event.images?.find(img => img.ratio === '16_9')?.url || event.images?.[0]?.url,
        venue: {
          id: venue.id,
          name: venue.name,
          city: venue.city?.name,
          state: venue.state?.name,
          country: venue.country?.name,
          address: venue.address?.line1,
        },
        artist: {
          id: attraction.id,
          name: attraction.name,
        }
      };
    });
  } catch (error) {
    console.error('Error fetching upcoming shows:', error);
    return [];
  }
}

/**
 * Fetch details for a specific show/event by ID
 * @param eventId The Ticketmaster event ID
 * @returns Show details
 */
export async function fetchShowDetails(eventId: string) {
  try {
    if (!eventId) {
      throw new Error("Event ID is required");
    }
    
    console.log(`Fetching details for show: ${eventId}`);
    const apiKey = import.meta.env.VITE_TICKETMASTER_API_KEY || 'k8GrSAkbFaN0w7qDxGl7ohr8LwdAQm9b';
    const url = `https://app.ticketmaster.com/discovery/v2/events/${eventId}.json?apikey=${apiKey}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      console.error(`Ticketmaster API error: ${response.status}`);
      throw new Error(`Failed to fetch event details: ${response.statusText}`);
    }
    
    const event = await response.json();
    
    if (!event) {
      throw new Error("No event found");
    }
    
    const venue = event._embedded?.venues?.[0] || {};
    const attraction = event._embedded?.attractions?.[0] || {};
    
    return {
      id: event.id,
      name: event.name,
      date: event.dates.start.dateTime,
      status: event.dates.status?.code,
      url: event.url,
      ticket_url: event.url,
      image: event.images?.find(img => img.ratio === '16_9')?.url || event.images?.[0]?.url,
      venue: {
        id: venue.id,
        name: venue.name,
        city: venue.city?.name,
        state: venue.state?.name,
        country: venue.country?.name,
        address: venue.address?.line1,
        location: {
          latitude: venue.location?.latitude,
          longitude: venue.location?.longitude,
        },
      },
      artist: {
        id: attraction.id,
        name: attraction.name,
        image: attraction.images?.find(img => img.ratio === '16_9')?.url || attraction.images?.[0]?.url,
      }
    };
  } catch (error) {
    console.error('Error fetching show details:', error);
    throw error;
  }
}

export { 
  // Removing searchArtistsWithEvents as we're implementing it directly in this file
  fetchFeaturedArtists,
  fetchArtistById
} from './api/artist';  // Updated import path to use the index.ts in the artist folder
export { 
  fetchArtistEvents, 
  fetchShowDetails, 
  fetchVenueDetails,
  fetchShowsByGenre,
  fetchFeaturedShows
} from './api/shows-api';

// Export utility functions for saving data to the database
export { 
  saveArtistToDatabase
} from './api/db/artist-utils';
export { 
  saveShowToDatabase
} from '@/lib/api/database-utils';
export { 
  saveVenueToDatabase
} from './api/db/venue-utils';

// Import supabase client
import { supabase } from '@/lib/supabase';import { Artist } from '@/types/artist';

// Define types for Ticketmaster API responses
interface TicketmasterImage {
  url: string;
  ratio?: string;
  width?: number;
  height?: number;
}

interface TicketmasterClassification {
  segment?: {
    name: string;
  };
  genre?: {
    name: string;
  };
}

interface TicketmasterAttraction {
  id: string;
  name: string;
  url?: string;
  images?: TicketmasterImage[];
  classifications?: TicketmasterClassification[];
}

interface TicketmasterVenue {
  id: string;
  name: string;
  city?: { name: string };
  state?: { name: string };
  country?: { name: string };
  address?: { line1: string };
  location?: { latitude: string; longitude: string };
}

interface TicketmasterEvent {
  id: string;
  name: string;
  url?: string;
  images?: TicketmasterImage[];
  dates: {
    start: { dateTime: string };
    status?: { code: string };
  };
  _embedded?: {
    venues?: TicketmasterVenue[];
    attractions?: TicketmasterAttraction[];
  };
}

interface TicketmasterEventsResponse {
  _embedded?: {
    events?: TicketmasterEvent[];
  };
  page?: {
    totalElements: number;
  };
}

// Setlist.fm related functions
export const fetchPastSetlists = async (artistId: string, artistName: string) => {
  try {
    const { data, error } = await supabase.functions.invoke('fetch-past-setlists', {
      body: { artistId, artistName }
    });
    
    if (error) {
      console.error("Error fetching past setlists:", error);
      throw error;
    }
    
    return data.setlists;
  } catch (error) {
    console.error("Error in fetchPastSetlists:", error);
    throw error;
  }
};

/**
 * Search for artists with upcoming events using the Ticketmaster API
 * @param query The search query
 * @returns Array of artists with upcoming events
 */
export async function searchArtistsWithEvents(query: string): Promise<Artist[]> {
  if (!query || query.length < 3) {
    return [];
  }

  try {
    // Use the direct events search with keyword to find artists with events in one call
    const apiKey = import.meta.env.VITE_TICKETMASTER_API_KEY || 'k8GrSAkbFaN0w7qDxGl7ohr8LwdAQm9b';
    const url = `https://app.ticketmaster.com/discovery/v2/events.json?keyword=${encodeURIComponent(query)}&classificationName=music&size=20&apikey=${apiKey}`;
    
    console.log('Searching Ticketmaster API for events with artist:', url);
    
    const response = await fetch(url);
    
    if (!response.ok) {
      console.error(`Ticketmaster API error: ${response.status}`);
      return [];
    }
    
    const data = await response.json() as TicketmasterEventsResponse;
    
    // If no events found, return empty array
    if (!data._embedded?.events || data._embedded.events.length === 0) {
      console.log('No events found for query:', query);
      return [];
    }
    
    // Extract unique artists from events
    const artistsMap = new Map<string, Artist>();
    
    data._embedded.events.forEach((event: TicketmasterEvent) => {
      if (event._embedded?.attractions) {
        event._embedded.attractions.forEach((attraction: TicketmasterAttraction) => {
          // Only include if it's a music artist
          if (attraction.classifications?.some((c: TicketmasterClassification) => 
              c.segment?.name === 'Music' || 
              c.segment?.name.toLowerCase() === 'music')) {
            
            // Get the first image with ratio 16_9 or any image if not found
            const images = attraction.images || [];
            const image = images.find((img: TicketmasterImage) => img.ratio === '16_9') || images[0];
            
            // Only add if not already in the map
            if (!artistsMap.has(attraction.id)) {
              artistsMap.set(attraction.id, {
                id: attraction.id,
                name: attraction.name,
                genres: attraction.classifications ? 
                  attraction.classifications.map((c: TicketmasterClassification) => c.genre?.name).filter(Boolean) : 
                  [],
                image: image?.url || null,
                ticketmasterUrl: attraction.url || null,
              });
            }
          }
        });
      }
    });
    
    console.log(`Found ${artistsMap.size} unique artists with events`);
    return Array.from(artistsMap.values());
  } catch (error) {
    console.error('Error searching artists with events:', error);
    // Return empty array instead of throwing to prevent UI errors
    return [];
  }
}

/**
 * Get all upcoming events for an artist
 * @param artistId The Ticketmaster artist ID
 * @returns Array of events
 */
export async function getArtistEvents(artistId: string) {
  try {
    const apiKey = import.meta.env.VITE_TICKETMASTER_API_KEY || 'k8GrSAkbFaN0w7qDxGl7ohr8LwdAQm9b';
    const url = `https://app.ticketmaster.com/discovery/v2/events.json?attractionId=${artistId}&apikey=${apiKey}&size=50&sort=date,asc`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Ticketmaster API error: ${response.status}`);
    }
    
    const data = await response.json() as TicketmasterEventsResponse;
    
    // If no events found, return empty array
    if (!data._embedded?.events || data._embedded.events.length === 0) {
      return [];
    }
    
    // Map events to a more usable format
    return data._embedded.events.map((event: TicketmasterEvent) => {
      const venue = event._embedded?.venues?.[0] || {} as TicketmasterVenue;
      
      return {
        id: event.id,
        name: event.name,
        date: event.dates.start.dateTime,
        status: event.dates.status?.code,
        url: event.url,
        image: event.images?.find((img: TicketmasterImage) => img.ratio === '16_9')?.url || event.images?.[0]?.url,
        venue: {
          id: venue.id,
          name: venue.name,
          city: venue.city?.name,
          state: venue.state?.name,
          country: venue.country?.name,
          address: venue.address?.line1,
          location: {
            latitude: venue.location?.latitude,
            longitude: venue.location?.longitude,
          },
        },
      };
    });
  } catch (error) {
    console.error('Error getting artist events:', error);
    throw error;
  }
}

/**
 * Get artist details from Ticketmaster
 * @param artistId The Ticketmaster artist ID
 * @returns Artist details
 */
export async function getArtistDetails(artistId: string): Promise<Artist | null> {
  try {
    const apiKey = import.meta.env.VITE_TICKETMASTER_API_KEY || 'k8GrSAkbFaN0w7qDxGl7ohr8LwdAQm9b';
    const url = `https://app.ticketmaster.com/discovery/v2/attractions/${artistId}.json?apikey=${apiKey}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Ticketmaster API error: ${response.status}`);
    }
    
    const attraction = await response.json() as TicketmasterAttraction;
    
    // Get the first image with ratio 16_9 or any image if not found
    const images = attraction.images || [];
    const image = images.find((img: TicketmasterImage) => img.ratio === '16_9') || images[0];
    
    return {
      id: attraction.id,
      name: attraction.name,
      genres: attraction.classifications ? 
        attraction.classifications.map((c: TicketmasterClassification) => c.genre?.name).filter(Boolean) : 
        [],
      image: image?.url || null,
      ticketmasterUrl: attraction.url || null,
    };
  } catch (error) {
    console.error('Error getting artist details:', error);
    return null;
  }
}
