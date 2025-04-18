import { ErrorSource, handleError } from '@/lib/error-handling';

// API base URL - use our Next.js API route
const API_BASE_URL = '/api/ticketmaster';

// API request configuration
const API_CONFIG = {
  maxRetries: 3,
  baseDelay: 1000, // 1 second
  timeout: 15000, // 15 seconds
};

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
 * Call Ticketmaster API through our Next.js API route
 */
export async function callTicketmasterApi(endpoint: string, params: Record<string, string> = {}) {
  try {
    // Build query string
    const searchParams = new URLSearchParams({ endpoint, ...params });
    const url = `${API_BASE_URL}?${searchParams.toString()}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    handleError({
      message: "Failed to call Ticketmaster API",
      source: ErrorSource.API,
      originalError: error
    });
    throw error;
  }
}
