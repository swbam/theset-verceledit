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
 * Call Ticketmaster API through our API route
 */
export async function callTicketmasterApi(endpoint: string, params: Record<string, string> = {}) {
  try {
    // Build query string
    const searchParams = new URLSearchParams({ endpoint, ...params });
    const url = `${API_BASE_URL}?${searchParams.toString()}`;
    
    console.log(`[callTicketmasterApi] Calling API: ${url}`);

    // Use AbortController to handle timeouts
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.timeout);

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      // Enhanced error handling with detailed logging
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[callTicketmasterApi] API error: ${response.status} ${response.statusText}`, errorText);
        
        // Provide detailed error information based on status code
        let errorMessage = `API error: ${response.status} ${response.statusText}`;
        
        if (response.status === 404) {
          errorMessage = `Resource not found: ${endpoint}`;
          console.error(`[callTicketmasterApi] 404 Not Found for endpoint: ${endpoint}`);
        } else if (response.status === 403) {
          errorMessage = `API access forbidden - check API key configuration`;
          console.error(`[callTicketmasterApi] 403 Forbidden - API key issue`);
        } else if (response.status === 429) {
          errorMessage = `Rate limit exceeded for Ticketmaster API`;
          console.error(`[callTicketmasterApi] 429 Too Many Requests - rate limited`);
        } else if (response.status >= 500) {
          errorMessage = `Ticketmaster API server error (${response.status})`;
          console.error(`[callTicketmasterApi] Server error ${response.status}`);
        }
        
        throw new Error(`${errorMessage} - ${errorText}`);
      }

      const data = await response.json();
      console.log(`[callTicketmasterApi] Successful response for ${endpoint}`);
      return data;
    } catch (fetchError) {
      if (fetchError.name === 'AbortError') {
        console.error(`[callTicketmasterApi] Request timeout after ${API_CONFIG.timeout}ms`);
        throw new Error(`API request timeout after ${API_CONFIG.timeout}ms`);
      }
      throw fetchError;
    }
  } catch (error) {
    console.error(`[callTicketmasterApi] Failed to call ${endpoint}:`, error);
    
    // Check if the error is related to CORS
    if (error.message && error.message.includes('CORS')) {
      console.error('[callTicketmasterApi] CORS error detected. Ensure the server is properly configured with CORS headers.');
    }
    
    // Check if the error is a network error
    if (error.message && error.message.includes('NetworkError')) {
      console.error('[callTicketmasterApi] Network error detected. Check your internet connection or if the API server is accessible.');
    }
    
    handleError({
      message: "Failed to call Ticketmaster API",
      source: ErrorSource.API,
      originalError: error
    });
    
    throw error;
  }
}
