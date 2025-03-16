
/**
 * Proxy API calls to avoid CORS issues
 */
export async function proxyTicketmasterApi(endpoint: string, queryParams: Record<string, string> = {}) {
  const TICKETMASTER_API_KEY = "k8GrSAkbFaN0w7qDxGl7ohr8LwdAQm9b";
  const TICKETMASTER_BASE_URL = "https://app.ticketmaster.com/discovery/v2";
  
  // Construct URL with query parameters
  const url = new URL(`${TICKETMASTER_BASE_URL}/${endpoint}`);
  
  // Add API key and other query parameters
  url.searchParams.append('apikey', TICKETMASTER_API_KEY);
  
  for (const [key, value] of Object.entries(queryParams)) {
    url.searchParams.append(key, value);
  }
  
  try {
    const response = await fetch(url.toString());
    
    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('API request error:', error);
    throw error;
  }
}
