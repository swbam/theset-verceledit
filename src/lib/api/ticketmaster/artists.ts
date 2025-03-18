
import { Artist } from '@/types/artist';
import { TICKETMASTER_API_KEY } from './config';
import { callTicketmasterApi } from './config';
import { TicketmasterAttraction, TicketmasterEventsResponse, TicketmasterImage, TicketmasterClassification } from './types';

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
    
    data._embedded.events.forEach(event => {
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
    return data._embedded.events.map(event => {
      const venue = event._embedded?.venues?.[0] || {};
      
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

/**
 * These functions are imported from artist files, but re-exported here for completeness
 */
export function fetchArtistById(artistId: string) {
  // This is imported from src/lib/api/artist/details.ts
  // Here just as a placeholder for the index.ts exports
  return Promise.resolve(null);
}

export function fetchFeaturedArtists(limit: number = 4) {
  // This is imported from src/lib/api/artist/featured.ts
  // Here just as a placeholder for the index.ts exports
  return Promise.resolve([]);
}
