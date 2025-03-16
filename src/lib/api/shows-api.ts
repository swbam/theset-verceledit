
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
    
    // Create the show in our database
    console.log(`Creating show in database: ${event.id} - ${event.name}`);
    
    // For now, we're just returning the transformed data
    // In a real implementation, this would also store the data in a database
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
      sort: 'relevance,desc', // Sort by relevance to get popular shows first
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
    // Fetch more shows to allow better filtering
    const data = await callTicketmasterApi('events.json', {
      size: '50', // Get more options to choose from
      segmentName: 'Music',
      sort: 'relevance,desc', // Sort by relevance to get more popular events
      includeFamily: 'no' // Filter out family events
    });

    if (!data._embedded?.events) {
      return [];
    }

    // Filter for events with high-quality images and venue information
    const qualityEvents = data._embedded.events
      .filter((event: any) => 
        // Must have a good quality image
        event.images.some((img: any) => img.ratio === "16_9" && img.width > 500) &&
        // Must have venue information
        event._embedded?.venues?.[0]?.name &&
        // Must have a start date
        event.dates?.start?.dateTime
      )
      // Calculate a "quality score" for each event
      .map((event: any) => {
        // Get artist from attractions if available
        let artistName = '';
        
        if (event._embedded?.attractions && event._embedded.attractions.length > 0) {
          artistName = event._embedded.attractions[0].name;
        } else {
          // Fallback to extracting from event name
          artistName = event.name.split(' at ')[0].split(' - ')[0].trim();
        }
        
        // Calculate a quality score based on various factors
        const qualityScore = (
          (event.rank || 0) * 2 + 
          (event._embedded?.venues?.[0]?.upcomingEvents?.totalEvents || 0) / 5 +
          (event.dates?.status?.code === "onsale" ? 5 : 0) +
          (event._embedded?.attractions?.length || 0) * 2
        );
        
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
          },
          qualityScore
        };
      })
      // Sort by our quality score
      .sort((a, b) => b.qualityScore - a.qualityScore)
      // Take only the top events
      .slice(0, limit);

    return qualityEvents;
  } catch (error) {
    console.error("Ticketmaster featured shows error:", error);
    toast.error("Failed to load featured shows");
    return [];
  }
}
