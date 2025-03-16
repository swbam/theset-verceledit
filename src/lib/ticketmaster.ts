
import { toast } from "sonner";

// Ticketmaster API key
const TICKETMASTER_API_KEY = "k8GrSAkbFaN0w7qDxGl7ohr8LwdAQm9b";
const TICKETMASTER_BASE_URL = "https://app.ticketmaster.com/discovery/v2";

/**
 * Search for artists with upcoming events
 */
export async function searchArtistsWithEvents(query: string, limit = 10): Promise<any[]> {
  try {
    if (!query.trim()) return [];
    
    // Use a proxy to avoid CORS issues
    const url = `/api/ticketmaster?endpoint=events.json&keyword=${encodeURIComponent(
      query
    )}&segmentName=Music&sort=date,asc&size=${limit}`;

    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error("Failed to fetch events from Ticketmaster");
    }
    
    const data = await response.json();

    if (!data._embedded?.events) {
      return [];
    }

    // Extract unique artists from events
    const artistsMap = new Map();
    
    data._embedded.events.forEach((event: any) => {
      // Get artist from attractions if available
      let artistName = '';
      let artistId = '';
      let artistImage = '';
      
      if (event._embedded?.attractions && event._embedded.attractions.length > 0) {
        const attraction = event._embedded.attractions[0];
        artistName = attraction.name;
        artistId = attraction.id;
        artistImage = attraction.images?.find((img: any) => img.ratio === "16_9" && img.width > 500)?.url;
      } else {
        // Fallback to extracting from event name if no attractions
        artistName = event.name.split(' at ')[0].split(' - ')[0].trim();
        artistId = `tm-${encodeURIComponent(artistName.toLowerCase().replace(/\s+/g, '-'))}`;
        artistImage = event.images.find((img: any) => img.ratio === "16_9" && img.width > 500)?.url;
      }
      
      if (!artistsMap.has(artistId)) {
        artistsMap.set(artistId, {
          id: artistId,
          name: artistName,
          image: artistImage,
          upcomingShows: 1
        });
      } else {
        // Increment upcoming shows count for this artist
        const artist = artistsMap.get(artistId);
        artist.upcomingShows += 1;
        artistsMap.set(artistId, artist);
      }
    });
    
    return Array.from(artistsMap.values());
  } catch (error) {
    console.error("Ticketmaster artist search error:", error);
    toast.error("Failed to search for artists");
    return [];
  }
}

/**
 * Fetch upcoming shows for an artist
 */
export async function fetchArtistEvents(artistName: string): Promise<any[]> {
  try {
    // Use a proxy to avoid CORS issues
    const url = `/api/ticketmaster?endpoint=events.json&keyword=${encodeURIComponent(
      artistName
    )}&segmentName=Music&sort=date,asc`;

    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error("Failed to fetch events from Ticketmaster");
    }
    
    const data = await response.json();

    if (!data._embedded?.events) {
      return [];
    }

    return data._embedded.events.map((event: any) => ({
      id: event.id,
      name: event.name,
      date: event.dates.start.dateTime,
      venue: event._embedded?.venues?.[0]
        ? {
            id: event._embedded.venues[0].id,
            name: event._embedded.venues[0].name,
            city: event._embedded.venues[0].city?.name,
            state: event._embedded.venues[0].state?.name,
            country: event._embedded.venues[0].country?.name,
          }
        : null,
      ticket_url: event.url,
      image_url: event.images.find((img: any) => img.ratio === "16_9" && img.width > 500)?.url,
    }));
  } catch (error) {
    console.error("Ticketmaster event error:", error);
    toast.error("Failed to load upcoming shows");
    return [];
  }
}

/**
 * Fetch venue details
 */
export async function fetchVenueDetails(venueId: string): Promise<any> {
  try {
    // Use a proxy to avoid CORS issues
    const url = `/api/ticketmaster?endpoint=venues/${venueId}.json`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error("Failed to fetch venue details");
    }
    
    return response.json();
  } catch (error) {
    console.error("Venue details error:", error);
    toast.error("Failed to load venue details");
    throw error;
  }
}

/**
 * Fetch details for a specific show
 */
export async function fetchShowDetails(eventId: string): Promise<any> {
  try {
    // Use a proxy to avoid CORS issues
    const url = `/api/ticketmaster?endpoint=events/${eventId}.json`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error("Failed to fetch event details");
    }
    
    const event = await response.json();
    
    // Get artist from attractions if available
    let artistName = '';
    let artistId = '';
    
    if (event._embedded?.attractions && event._embedded.attractions.length > 0) {
      const attraction = event._embedded.attractions[0];
      artistName = attraction.name;
      artistId = attraction.id;
    } else {
      // Fallback to extracting from event name
      artistName = event.name.split(' at ')[0].split(' - ')[0].trim();
      artistId = `tm-${encodeURIComponent(artistName.toLowerCase().replace(/\s+/g, '-'))}`;
    }
    
    return {
      id: event.id,
      name: event.name,
      date: event.dates.start.dateTime,
      artist: {
        id: artistId,
        name: artistName,
      },
      venue: event._embedded?.venues?.[0]
        ? {
            id: event._embedded.venues[0].id,
            name: event._embedded.venues[0].name,
            city: event._embedded.venues[0].city?.name,
            state: event._embedded.venues[0].state?.name,
            country: event._embedded.venues[0].country?.name,
          }
        : null,
      ticket_url: event.url,
      image_url: event.images.find((img: any) => img.ratio === "16_9" && img.width > 500)?.url,
    };
  } catch (error) {
    console.error("Show details error:", error);
    toast.error("Failed to load show details");
    throw error;
  }
}

/**
 * Fetch upcoming shows by genre
 */
export async function fetchShowsByGenre(genreId: string, limit = 8): Promise<any[]> {
  try {
    // Use a proxy to avoid CORS issues
    const url = `/api/ticketmaster?endpoint=events.json&classificationId=${genreId}&segmentName=Music&sort=date,asc&size=${limit}`;

    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error("Failed to fetch events from Ticketmaster");
    }
    
    const data = await response.json();

    if (!data._embedded?.events) {
      return [];
    }

    return data._embedded.events.map((event: any) => {
      // Get artist from attractions if available
      let artistName = '';
      let artistId = '';
      
      if (event._embedded?.attractions && event._embedded.attractions.length > 0) {
        const attraction = event._embedded.attractions[0];
        artistName = attraction.name;
        artistId = attraction.id;
      } else {
        // Fallback to extracting from event name
        artistName = event.name.split(' at ')[0].split(' - ')[0].trim();
        artistId = `tm-${encodeURIComponent(artistName.toLowerCase().replace(/\s+/g, '-'))}`;
      }
      
      return {
        id: event.id,
        name: event.name,
        date: event.dates.start.dateTime,
        venue: event._embedded?.venues?.[0]
          ? {
              id: event._embedded.venues[0].id,
              name: event._embedded.venues[0].name,
              city: event._embedded.venues[0].city?.name,
              state: event._embedded.venues[0].state?.name,
              country: event._embedded.venues[0].country?.name,
            }
          : null,
        ticket_url: event.url,
        image_url: event.images.find((img: any) => img.ratio === "16_9" && img.width > 500)?.url,
        artist: {
          id: artistId,
          name: artistName
        }
      };
    });
  } catch (error) {
    console.error("Ticketmaster events by genre error:", error);
    toast.error("Failed to load shows for this genre");
    return [];
  }
}

/**
 * Fetch featured artists with upcoming shows
 */
export async function fetchFeaturedArtists(limit = 4): Promise<any[]> {
  try {
    // Use a proxy to avoid CORS issues
    const url = `/api/ticketmaster?endpoint=events.json&size=50&segmentName=Music&sort=date,asc`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error("Failed to fetch events from Ticketmaster");
    }
    
    const data = await response.json();

    if (!data._embedded?.events) {
      return [];
    }

    // Extract unique artists from events
    const artistsMap = new Map();
    
    data._embedded.events.forEach((event: any) => {
      if (event._embedded?.attractions && event._embedded.attractions.length > 0) {
        event._embedded.attractions.forEach((attraction: any) => {
          if (!artistsMap.has(attraction.id) && attraction.classifications?.[0]?.segment?.name === "Music") {
            const image = attraction.images?.find((img: any) => img.ratio === "1_1")?.url || 
                         attraction.images?.find((img: any) => img.ratio === "16_9")?.url;
            
            const genres = [];
            if (attraction.classifications?.[0]?.genre?.name) {
              genres.push(attraction.classifications[0].genre.name);
            }
            if (attraction.classifications?.[0]?.subGenre?.name) {
              genres.push(attraction.classifications[0].subGenre.name);
            }
            
            artistsMap.set(attraction.id, {
              id: attraction.id,
              name: attraction.name,
              image: image,
              genres: genres,
              upcoming_shows: 1
            });
          } else if (artistsMap.has(attraction.id)) {
            // Increment upcoming shows count for this artist
            const artist = artistsMap.get(attraction.id);
            artist.upcoming_shows += 1;
            artistsMap.set(attraction.id, artist);
          }
        });
      }
    });
    
    // Get the most popular artists (those with most upcoming shows)
    return Array.from(artistsMap.values())
      .sort((a, b) => b.upcoming_shows - a.upcoming_shows)
      .slice(0, limit);
  } catch (error) {
    console.error("Ticketmaster featured artists error:", error);
    toast.error("Failed to load featured artists");
    return [];
  }
}

/**
 * Fetch featured shows
 */
export async function fetchFeaturedShows(limit = 4): Promise<any[]> {
  try {
    // Use a proxy to avoid CORS issues
    const url = `/api/ticketmaster?endpoint=events.json&size=${limit}&segmentName=Music&sort=relevance,desc`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error("Failed to fetch events from Ticketmaster");
    }
    
    const data = await response.json();

    if (!data._embedded?.events) {
      return [];
    }

    return data._embedded.events.map((event: any) => {
      // Get artist from attractions if available
      let artistName = '';
      
      if (event._embedded?.attractions && event._embedded.attractions.length > 0) {
        artistName = event._embedded.attractions[0].name;
      } else {
        // Fallback to extracting from event name
        artistName = event.name.split(' at ')[0].split(' - ')[0].trim();
      }
      
      return {
        id: event.id,
        name: event.name,
        date: event.dates.start.dateTime,
        venue: event._embedded?.venues?.[0]
          ? {
              id: event._embedded.venues[0].id,
              name: event._embedded.venues[0].name,
              city: event._embedded.venues[0].city?.name,
              state: event._embedded.venues[0].state?.name,
              country: event._embedded.venues[0].country?.name,
            }
          : null,
        ticket_url: event.url,
        image_url: event.images.find((img: any) => img.ratio === "16_9" && img.width > 500)?.url,
        artist: {
          name: artistName
        }
      };
    });
  } catch (error) {
    console.error("Ticketmaster featured shows error:", error);
    toast.error("Failed to load featured shows");
    return [];
  }
}

/**
 * Get popular music genres
 */
export const popularMusicGenres = [
  { id: "KnvZfZ7vAeA", name: "Rock" },
  { id: "KnvZfZ7vAvv", name: "Pop" },
  { id: "KnvZfZ7vAv1", name: "Hip-Hop / Rap" },
  { id: "KnvZfZ7vAvF", name: "Electronic" },
  { id: "KnvZfZ7vAvE", name: "R&B" },
  { id: "KnvZfZ7vAva", name: "Alternative" },
  { id: "KnvZfZ7vAv6", name: "Country" },
  { id: "KnvZfZ7vAe1", name: "Latin" },
  { id: "KnvZfZ7vAeJ", name: "Jazz" },
];
