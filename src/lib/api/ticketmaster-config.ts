
import { ErrorSource, handleError } from '@/lib/error-handling';

// Ticketmaster API key
const TICKETMASTER_API_KEY = import.meta.env.VITE_TICKETMASTER_API_KEY || 'k8GrSAkbFaN0w7qDxGl7ohr8LwdAQm9b';

// Ticketmaster API base URL
const API_BASE_URL = 'https://app.ticketmaster.com/discovery/v2/';

// Popular music genres for filtering
export const popularMusicGenres = [
  { id: 'KnvZfZ7vAeA', name: 'Rock' },
  { id: 'KnvZfZ7vAev', name: 'Pop' },
  { id: 'KnvZfZ7vAvt', name: 'Electronic' },
  { id: 'KnvZfZ7vAvd', name: 'R&B' },
  { id: 'KnvZfZ7vAee', name: 'Folk' },
  { id: 'KnvZfZ7vAe6', name: 'Country' },
  { id: 'KnvZfZ7vAeJ', name: 'Hip-Hop/Rap' },
  { id: 'KnvZfZ7vAeI', name: 'Reggae' },
  { id: 'KnvZfZ7vAv6', name: 'Blues' },
  { id: 'KnvZfZ7vAvE', name: 'Jazz' },
  { id: 'KnvZfZ7vAv1', name: 'Classical' },
  { id: 'KnvZfZ7vAde', name: 'Alternative' },
  { id: 'KnvZfZ7vAdt', name: 'World' },
  { id: 'KnvZfZ7vAda', name: 'Metal' }
];

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
