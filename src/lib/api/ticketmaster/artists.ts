import { callTicketmasterApi } from './config';
import { supabase } from '@/lib/supabase';
import { TicketmasterEventsResponse, TicketmasterAttraction } from './types';

/**
 * Search for artists who have upcoming events
 * @param query The search string
 * @param size Number of results to return
 * @returns Array of artists with events
 */
export async function searchArtistsWithEvents(query: string, size = 10) {
  try {
    if (!query) {
      return { artists: [] };
    }
    
    // First search for attractions (artists) that match the query
    const attractionsData = await callTicketmasterApi('attractions.json', {
      keyword: query,
      size: size,
    });
    
    if (!attractionsData?._embedded?.attractions) {
      return { artists: [] };
    }
    
    // Map the attractions to a more usable format
    const artists = attractionsData._embedded.attractions.map((attraction: TicketmasterAttraction) => ({
      id: attraction.id,
      name: attraction.name,
      imageUrl: attraction.images?.[0]?.url || null,
      url: attraction.url,
      hasEvents: attraction.upcomingEvents?._total !== "0"
    }));
    
    return { artists };
  } catch (error) {
    console.error('Error searching for artists with events:', error);
    return { artists: [] };
  }
}

/**
 * Get upcoming events for a specific artist by ID
 * @param artistId The Ticketmaster artist ID
 * @param size Number of events to return
 * @returns Array of upcoming events for the artist
 */
export async function getArtistEvents(artistId: string, size = 10) {
  try {
    if (!artistId) {
      throw new Error("Artist ID is required");
    }
    
    console.log(`Fetching events for artist: ${artistId}`);
    
    const data = await callTicketmasterApi('events.json', {
      attractionId: artistId,
      size: size,
      sort: 'date,asc',
    });
    
    if (!data?._embedded?.events) {
      return { events: [] };
    }
    
    // Map the events to a more usable format
    const events = data._embedded.events.map((event: any) => ({
      id: event.id,
      name: event.name,
      date: event.dates.start.dateTime,
      url: event.url,
      imageUrl: event.images?.[0]?.url || null,
      venue: event._embedded?.venues?.[0]?.name || "Venue TBA",
      city: event._embedded?.venues?.[0]?.city?.name || "",
      state: event._embedded?.venues?.[0]?.state?.name || "",
      country: event._embedded?.venues?.[0]?.country?.name || "",
    }));
    
    return { events };
  } catch (error) {
    console.error('Error getting artist events:', error);
    throw error;
  }
}

/**
 * Get details for a specific artist by ID
 * @param artistId The Ticketmaster artist ID
 * @returns Artist details
 */
export async function getArtistDetails(artistId: string) {
  try {
    if (!artistId) {
      throw new Error("Artist ID is required");
    }
    
    console.log(`Fetching details for artist: ${artistId}`);
    
    const data = await callTicketmasterApi(`attractions/${artistId}.json`);
    
    if (!data) {
      throw new Error("No artist found");
    }
    
    // Map classification data for music genre
    const classifications = data.classifications || [];
    const genreInfo = classifications.reduce((acc: any, classification: any) => {
      if (classification.segment?.name === "Music") {
        acc.genre = classification.genre?.name || acc.genre;
        acc.subGenre = classification.subGenre?.name || acc.subGenre;
      }
      return acc;
    }, { genre: "Other", subGenre: null });
    
    return {
      id: data.id,
      name: data.name,
      images: data.images || [],
      url: data.url,
      genre: genreInfo.genre,
      subGenre: genreInfo.subGenre,
      upcomingEventsCount: data.upcomingEvents?._total || 0
    };
  } catch (error) {
    console.error('Error getting artist details:', error);
    throw error;
  }
}

/**
 * Fetch artist details by ID
 * @param artistId The Ticketmaster artist ID
 * @returns Artist details
 */
export async function fetchArtistById(artistId: string) {
  try {
    if (!artistId) {
      throw new Error("Artist ID is required");
    }
    
    // First check if the artist exists in our database
    const { data: existingArtist, error: existingArtistError } = await supabase
      .from('artists')
      .select('*')
      .eq('ticketmaster_id', artistId)
      .single();
    
    if (existingArtistError && existingArtistError.code !== 'PGRST116') {
      console.error('Error checking for existing artist:', existingArtistError);
    }
    
    // If artist exists and was updated recently, return it
    if (existingArtist) {
      // Check if the artist was updated in the last 7 days
      const lastUpdateTime = new Date(existingArtist.updated_at).getTime();
      const currentTime = new Date().getTime();
      const daysSinceUpdate = (currentTime - lastUpdateTime) / (1000 * 60 * 60 * 24);
      
      if (daysSinceUpdate < 7) {
        return existingArtist;
      }
    }
    
    // Otherwise fetch from Ticketmaster
    const artistDetails = await getArtistDetails(artistId);
    
    return artistDetails;
  } catch (error) {
    console.error('Error fetching artist by ID:', error);
    throw error;
  }
}

/**
 * Fetch featured artists (artists with most upcoming shows)
 * @param count Number of artists to return
 * @returns Array of featured artists
 */
export async function fetchFeaturedArtists(count = 8) {
  try {
    // First try to get featured artists from the database
    const { data: featuredArtists, error: featuredArtistsError } = await supabase
      .from('artists')
      .select('*')
      .order('upcoming_events_count', { ascending: false })
      .limit(count);
    
    if (featuredArtistsError) {
      console.error('Error fetching featured artists from database:', featuredArtistsError);
    }
    
    if (featuredArtists && featuredArtists.length === count) {
      return featuredArtists;
    }
    
    // If we don't have enough featured artists, fetch trending events
    // and extract the artists from them
    const events = await callTicketmasterApi('events.json', {
      classificationName: 'music',
      size: 20,
      sort: 'relevance,desc',
    });
    
    if (!events._embedded?.events) {
      return featuredArtists || [];
    }
    
    // Extract unique artists from the events
    const artistsMap = new Map();
    
    events._embedded.events.forEach((event: any) => {
      if (event._embedded?.attractions) {
        event._embedded.attractions.forEach((attraction: any) => {
          if (!artistsMap.has(attraction.id) && attraction.id) {
            artistsMap.set(attraction.id, {
              id: attraction.id,
              name: attraction.name,
              imageUrl: attraction.images?.[0]?.url || null,
              genre: event.classifications?.[0]?.genre?.name || "Other",
              upcomingEventsCount: attraction.upcomingEvents?._total || 0
            });
          }
        });
      }
    });
    
    const uniqueArtists = Array.from(artistsMap.values()).slice(0, count);
    
    return uniqueArtists;
  } catch (error) {
    console.error('Error fetching featured artists:', error);
    // Return any featured artists we found in the database, or an empty array
    return [];
  }
}
