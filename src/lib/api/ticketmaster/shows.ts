
import { Artist } from '@/types/artist';
import { TICKETMASTER_API_KEY } from './config';
import { callTicketmasterApi } from './config';
import { TicketmasterVenue, TicketmasterAttraction, TicketmasterEventsResponse } from './types';

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

/**
 * Fetch shows filtered by genre
 * Implementation placeholder - this should be imported from shows-api.ts
 */
export function fetchShowsByGenre(genreId: string, limit: number = 10) {
  // This function is imported from elsewhere, but included here for completeness
  return callTicketmasterApi('events.json', {
    genreId,
    size: limit.toString(),
    sort: 'date,asc',
    classificationName: 'music'
  }).then(data => data._embedded?.events || []);
}

/**
 * Fetch featured shows
 * Implementation placeholder - this should be imported from shows-api.ts
 */
export function fetchFeaturedShows(limit: number = 4) {
  // This function is imported from elsewhere, but included here for completeness
  return callTicketmasterApi('events.json', {
    size: limit.toString(),
    sort: 'relevance,desc',
    classificationName: 'music'
  }).then(data => data._embedded?.events || []);
}
