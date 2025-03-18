
import { callTicketmasterApi } from './config';

/**
 * Fetch venue details from Ticketmaster
 * @param venueId The Ticketmaster venue ID
 * @returns Venue details
 */
export async function fetchVenueDetails(venueId: string) {
  try {
    if (!venueId) {
      throw new Error("Venue ID is required");
    }
    
    console.log(`Fetching details for venue: ${venueId}`);
    
    const data = await callTicketmasterApi(`venues/${venueId}.json`);
    
    if (!data) {
      throw new Error("No venue found");
    }
    
    return {
      id: data.id,
      name: data.name,
      city: data.city?.name,
      state: data.state?.name,
      country: data.country?.name,
      address: data.address?.line1,
      postalCode: data.postalCode,
      location: data.location ? {
        latitude: data.location.latitude,
        longitude: data.location.longitude
      } : null,
      url: data.url,
      images: data.images
    };
  } catch (error) {
    console.error('Error fetching venue details:', error);
    throw error;
  }
}
