
import { toast } from "sonner";

// Ticketmaster API key
const TICKETMASTER_API_KEY = "k8GrSAkbFaN0w7qDxGl7ohr8LwdAQm9b";
const TICKETMASTER_BASE_URL = "https://app.ticketmaster.com/discovery/v2";

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
