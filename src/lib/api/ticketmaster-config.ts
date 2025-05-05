import { ErrorSource, handleError } from '@/lib/error-handling';

// Direct Ticketmaster API URL
const API_BASE_URL = 'https://app.ticketmaster.com/discovery/v2';

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
 * Implements delay with exponential backoff
 */
const delay = (retryCount: number) => {
  const delayTime = API_CONFIG.baseDelay * Math.pow(2, retryCount);
  return new Promise(resolve => setTimeout(resolve, delayTime));
};

// Custom error type with noRetry property
interface ApiErrorCause {
  noRetry?: boolean;
}

// Ticketmaster API error response types
interface TicketmasterErrorResponse {
  fault?: {
    faultstring?: string;
  };
  errors?: Array<{
    code?: string;
    detail?: string;
    status?: string;
  }>;
}

/**
 * Call Ticketmaster API with specified endpoint and parameters
 * Includes retry logic with exponential backoff
 */
export async function callTicketmasterApi(endpoint: string, params: Record<string, string> = {}) {
  let retryCount = 0;
  let lastError: Error | null = null;

  const apiKey = import.meta.env.VITE_TICKETMASTER_API_KEY;
  if (!apiKey) {
    handleError({
      message: 'VITE_TICKETMASTER_API_KEY not configured',
      source: ErrorSource.CONFIG,
      step: 'Ticketmaster API Config'
    });
    return { _embedded: { events: [], attractions: [] } };
  }

  while (retryCount <= API_CONFIG.maxRetries) {
    try {
      // Ensure endpoint starts with a forward slash
      const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
      const url = new URL(`${API_BASE_URL}${normalizedEndpoint}`);
      
      // Add API key first
      url.searchParams.append('apikey', apiKey);
      
      // Add additional parameters, filtering out undefined/null values
      Object.entries(params).forEach(([key, value]) => {
        if (value != null && value !== '') {
          url.searchParams.append(key, value);
        }
      });
      
      // Add timeout to fetch
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.timeout);
      
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      // Parse the response data
      let errorData: TicketmasterErrorResponse = {};
      let data: any;
      
      const responseText = await response.text();
      try {
        data = JSON.parse(responseText);
        errorData = data as TicketmasterErrorResponse;
      } catch (parseError) {
        console.error('Failed to parse Ticketmaster API response:', parseError, 'Response text:', responseText);
        if (!response.ok) {
          throw new Error(`Ticketmaster API error (${response.status}): ${response.statusText}`);
        }
      }
      
      if (!response.ok) {
        // Check if we should retry based on status code
        if ([429, 500, 502, 503, 504].includes(response.status)) {
          throw new Error(`Ticketmaster API error (${response.status}): ${errorData.fault?.faultstring || response.statusText}`);
        }
        
        // For other status codes, we shouldn't retry
        let errorMessage = `Ticketmaster API error (${response.status}): ${response.statusText}`;
        
        if (errorData.fault?.faultstring) {
          errorMessage = `Ticketmaster API error (${response.status}): ${errorData.fault.faultstring}`;
        } else if (errorData.errors?.[0]) {
          errorMessage = `Ticketmaster API error (${response.status}): ${errorData.errors[0].detail || errorData.errors[0].code || response.statusText}`;
        }
        
        const error = new Error(errorMessage);
        (error as Error & { cause: ApiErrorCause }).cause = { noRetry: true };
        throw error;
      }
      
      return data;
    } catch (error) {
      const typedError = error as Error & { cause?: ApiErrorCause, name?: string };
      lastError = typedError;
      
      const isAbortError = typedError.name === 'AbortError';
      const isNoRetry = typedError.cause?.noRetry === true;
      
      if (isAbortError || isNoRetry || retryCount >= API_CONFIG.maxRetries) {
        break;
      }
      
      retryCount++;
      await delay(retryCount);
    }
  }
  
  handleError({
    message: `Error calling Ticketmaster API after ${retryCount} retries: ${lastError?.message || 'Unknown error'}`,
    source: ErrorSource.API,
    step: 'Ticketmaster API Call',
    originalError: lastError,
    context: { endpoint, params }
  });
  
  // Return empty data structure that matches the expected format
  return { _embedded: { events: [], attractions: [] } };
}

/**
 * Fetch artist events from Ticketmaster
 */
export async function fetchArtistEvents(artistId: string) {
  if (!artistId) {
    console.warn('fetchArtistEvents called without artistId');
    return [];
  }

  const params = {
    attractionId: artistId,
    sort: 'date,asc',
    size: '100',
    includeTBA: 'no',  // Exclude TBA events
    includeTest: 'no', // Exclude test events
    source: 'ticketmaster'
  };

  try {
    const data = await callTicketmasterApi('events', params);
    return data._embedded?.events || [];
  } catch (error) {
    console.error('Error fetching artist events:', error);
    return [];
  }
}

/**
 * Search for artists by keyword
 */
export async function searchArtists(keyword: string, size: string = '10') {
  if (!keyword) {
    console.warn('searchArtists called without keyword');
    return [];
  }

  const params = {
    keyword: keyword.trim(),
    size,
    classificationName: 'music',
    source: 'ticketmaster'
  };

  try {
    const data = await callTicketmasterApi('attractions', params);
    return data._embedded?.attractions || [];
  } catch (error) {
    console.error('Error searching artists:', error);
    return [];
  }
}
