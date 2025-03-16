
import { toast } from "sonner";
import { callTicketmasterApi } from "./ticketmaster-config";

/**
 * Fetch upcoming shows for an artist
 */
export async function fetchArtistEvents(artistName: string): Promise<any[]> {
  try {
    const data = await callTicketmasterApi('events.json', {
      keyword: artistName,
      segmentName: 'Music',
      sort: 'date,asc'
    });

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
 * Fetch details for a specific show
 */
export async function fetchShowDetails(eventId: string): Promise<any> {
  try {
    const event = await callTicketmasterApi(`events/${eventId}.json`);
    
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
 * Fetch venue details
 */
export async function fetchVenueDetails(venueId: string): Promise<any> {
  try {
    return await callTicketmasterApi(`venues/${venueId}.json`);
  } catch (error) {
    console.error("Venue details error:", error);
    toast.error("Failed to load venue details");
    throw error;
  }
}

/**
 * Fetch upcoming shows by genre
 */
export async function fetchShowsByGenre(genreId: string, limit = 8): Promise<any[]> {
  try {
    const data = await callTicketmasterApi('events.json', {
      classificationId: genreId,
      segmentName: 'Music',
      sort: 'date,asc',
      size: limit.toString()
    });

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
 * Fetch featured shows
 */
export async function fetchFeaturedShows(limit = 4): Promise<any[]> {
  try {
    const data = await callTicketmasterApi('events.json', {
      size: limit.toString(),
      segmentName: 'Music',
      sort: 'relevance,desc'
    });

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
