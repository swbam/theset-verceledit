
import { toast } from "sonner";

// Ticketmaster API key
export const TICKETMASTER_API_KEY = import.meta.env.VITE_TICKETMASTER_API_KEY || "k8GrSAkbFaN0w7qDxGl7ohr8LwdAQm9b";
export const TICKETMASTER_BASE_URL = "https://app.ticketmaster.com/discovery/v2";

/**
 * Make a request to the Ticketmaster API directly
 */
export async function callTicketmasterApi(endpoint: string, params: Record<string, string> = {}) {
  try {
    // Construct URL with query parameters
    const url = new URL(`${TICKETMASTER_BASE_URL}/${endpoint}`);
    
    // Add API key
    url.searchParams.append('apikey', TICKETMASTER_API_KEY);
    
    // Add other query parameters
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.append(key, value);
    }
    
    console.log('Fetching from Ticketmaster API:', url.toString());
    const response = await fetch(url.toString());
    
    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Ticketmaster API error:', error);
    throw error;
  }
}

/**
 * Get upcoming trending concerts
 * - Sorts by popularity (highest relevance score)
 * - Includes only music events
 * - Filters by date range (upcoming events)
 * - Size parameter allows pagination
 */
export async function getTrendingConcerts(size = 20, page = 0) {
  try {
    const params = {
      classificationName: 'music',
      sort: 'relevance,desc',
      size: size.toString(),
      page: page.toString(),
      startDateTime: new Date().toISOString().slice(0, 19) + 'Z'
    };
    
    const data = await callTicketmasterApi('events.json', params);
    return data._embedded?.events || [];
  } catch (error) {
    console.error('Error fetching trending concerts:', error);
    toast.error('Failed to load concerts');
    return [];
  }
}

/**
 * Popular music genres used throughout the app
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
