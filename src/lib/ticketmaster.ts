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
    
    const url = `${TICKETMASTER_BASE_URL}/events.json?keyword=${encodeURIComponent(
      query
    )}&segmentName=Music&sort=date,asc&size=${limit}&apikey=${TICKETMASTER_API_KEY}`;

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
      // Extract artist name from event name (this is a simplification)
      // In a real app, we'd use a more robust method to extract artist names
      const artistName = event.name.split(' at ')[0].split(' - ')[0].trim();
      
      if (!artistsMap.has(artistName)) {
        const artistImage = event.images.find((img: any) => img.ratio === "16_9" && img.width > 500)?.url;
        
        artistsMap.set(artistName, {
          name: artistName,
          // Generate a deterministic ID based on the name since Ticketmaster doesn't provide artist IDs directly
          id: `tm-${encodeURIComponent(artistName.toLowerCase().replace(/\s+/g, '-'))}`,
          image: artistImage,
          // Count upcoming shows for this artist
          upcomingShows: 1
        });
      } else {
        // Increment upcoming shows count for this artist
        const artist = artistsMap.get(artistName);
        artist.upcomingShows += 1;
        artistsMap.set(artistName, artist);
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
    const url = `${TICKETMASTER_BASE_URL}/events.json?keyword=${encodeURIComponent(
      artistName
    )}&segmentName=Music&sort=date,asc&apikey=${TICKETMASTER_API_KEY}`;

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
    const url = `${TICKETMASTER_BASE_URL}/venues/${venueId}.json?apikey=${TICKETMASTER_API_KEY}`;
    
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
    const url = `${TICKETMASTER_BASE_URL}/events/${eventId}.json?apikey=${TICKETMASTER_API_KEY}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error("Failed to fetch event details");
    }
    
    const event = await response.json();
    
    // Extract the artist name to use for getting artist ID
    const artistName = event.name.split(' at ')[0].split(' - ')[0].trim();
    const artistId = `tm-${encodeURIComponent(artistName.toLowerCase().replace(/\s+/g, '-'))}`;
    
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
    const url = `${TICKETMASTER_BASE_URL}/events.json?classificationId=${genreId}&segmentName=Music&sort=date,asc&size=${limit}&apikey=${TICKETMASTER_API_KEY}`;

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
      artist: {
        name: event.name.split(' at ')[0].split(' - ')[0].trim()
      }
    }));
  } catch (error) {
    console.error("Ticketmaster events by genre error:", error);
    toast.error("Failed to load shows for this genre");
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
