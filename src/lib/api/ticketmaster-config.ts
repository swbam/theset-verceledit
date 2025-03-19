
import { ErrorSource, handleError } from '@/lib/error-handling';

// Ticketmaster API key
const TICKETMASTER_API_KEY = import.meta.env.VITE_TICKETMASTER_API_KEY || 'k8GrSAkbFaN0w7qDxGl7ohr8LwdAQm9b';

// Ticketmaster API base URL
const API_BASE_URL = 'https://app.ticketmaster.com/discovery/v2/';

/**
 * Call Ticketmaster API with specified endpoint and parameters
 */
export async function callTicketmasterApi(endpoint: string, params: Record<string, string> = {}) {
  try {
    const url = new URL(endpoint, API_BASE_URL);
    
    // Add API key to all requests
    url.searchParams.append('apikey', TICKETMASTER_API_KEY);
    
    // Add additional parameters
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });
    
    console.log(`Calling Ticketmaster API: ${url.toString()}`);
    
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      }
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Ticketmaster API error (${response.status}): ${errorData.fault?.faultstring || response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    handleError({
      message: `Error calling Ticketmaster API: ${(error as Error).message}`,
      source: ErrorSource.API,
      step: 'Ticketmaster API Call',
      originalError: error
    });
    return null;
  }
}
