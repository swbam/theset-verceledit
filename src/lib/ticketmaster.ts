// Re-export all functions from the different modules
export { 
  popularMusicGenres,
  getTrendingConcerts
} from './api/ticketmaster-config';
export { 
  searchArtistsWithEvents, 
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
import { supabase } from '@/integrations/supabase/client';
import { Artist } from '@/types/artist';

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
    // First, search for attractions (artists) that match the query
    const apiKey = process.env.NEXT_PUBLIC_TICKETMASTER_API_KEY || process.env.TICKETMASTER_API_KEY;
    const url = `https://app.ticketmaster.com/discovery/v2/attractions.json?keyword=${encodeURIComponent(query)}&apikey=${apiKey}&size=10`;
    
    console.log('Searching Ticketmaster API:', url);
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Ticketmaster API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    // If no attractions found, return empty array
    if (!data._embedded || !data._embedded.attractions) {
      return [];
    }
    
    // Map attractions to artists with basic info
    const artists: Artist[] = data._embedded.attractions.map((attraction: any) => {
      // Get the first image with ratio 16_9 or any image if not found
      const images = attraction.images || [];
      const image = images.find((img: any) => img.ratio === '16_9') || images[0];
      
      return {
        id: attraction.id,
        name: attraction.name,
        genres: attraction.classifications ? 
          attraction.classifications.map((c: any) => c.genre?.name).filter(Boolean) : 
          [],
        image: image?.url || null,
        ticketmasterUrl: attraction.url || null,
      };
    });
    
    // Filter for artists with upcoming events by checking each one
    const artistsWithEvents = await Promise.all(
      artists.map(async (artist) => {
        try {
          // Check if artist has events
          const eventsUrl = `https://app.ticketmaster.com/discovery/v2/events.json?attractionId=${artist.id}&apikey=${apiKey}&size=1`;
          const eventsResponse = await fetch(eventsUrl);
          
          if (!eventsResponse.ok) {
            return null;
          }
          
          const eventsData = await eventsResponse.json();
          
          // If artist has events, return the artist
          if (eventsData.page.totalElements > 0) {
            return artist;
          }
          
          return null;
        } catch (error) {
          console.error(`Error checking events for artist ${artist.name}:`, error);
          return null;
        }
      })
    );
    
    // Filter out null values (artists without events)
    return artistsWithEvents.filter(Boolean) as Artist[];
  } catch (error) {
    console.error('Error searching artists with events:', error);
    throw error;
  }
}

/**
 * Get all upcoming events for an artist
 * @param artistId The Ticketmaster artist ID
 * @returns Array of events
 */
export async function getArtistEvents(artistId: string) {
  try {
    const apiKey = process.env.NEXT_PUBLIC_TICKETMASTER_API_KEY || process.env.TICKETMASTER_API_KEY;
    const url = `https://app.ticketmaster.com/discovery/v2/events.json?attractionId=${artistId}&apikey=${apiKey}&size=50&sort=date,asc`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Ticketmaster API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    // If no events found, return empty array
    if (!data._embedded || !data._embedded.events) {
      return [];
    }
    
    // Map events to a more usable format
    return data._embedded.events.map((event: any) => {
      const venue = event._embedded?.venues?.[0] || {};
      
      return {
        id: event.id,
        name: event.name,
        date: event.dates.start.dateTime,
        status: event.dates.status?.code,
        url: event.url,
        image: event.images?.find((img: any) => img.ratio === '16_9')?.url || event.images?.[0]?.url,
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
    const apiKey = process.env.NEXT_PUBLIC_TICKETMASTER_API_KEY || process.env.TICKETMASTER_API_KEY;
    const url = `https://app.ticketmaster.com/discovery/v2/attractions/${artistId}.json?apikey=${apiKey}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Ticketmaster API error: ${response.status}`);
    }
    
    const attraction = await response.json();
    
    // Get the first image with ratio 16_9 or any image if not found
    const images = attraction.images || [];
    const image = images.find((img: any) => img.ratio === '16_9') || images[0];
    
    return {
      id: attraction.id,
      name: attraction.name,
      genres: attraction.classifications ? 
        attraction.classifications.map((c: any) => c.genre?.name).filter(Boolean) : 
        [],
      image: image?.url || null,
      ticketmasterUrl: attraction.url || null,
    };
  } catch (error) {
    console.error('Error getting artist details:', error);
    return null;
  }
}
