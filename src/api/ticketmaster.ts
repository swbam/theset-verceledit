
import { proxyTicketmasterApi } from '@/lib/api';

/**
 * Handle Ticketmaster API proxy requests
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const endpoint = url.searchParams.get('endpoint') || '';
  
  // Create a copy of the search params without the endpoint parameter
  const queryParams: Record<string, string> = {};
  url.searchParams.forEach((value, key) => {
    if (key !== 'endpoint') {
      queryParams[key] = value;
    }
  });
  
  try {
    const data = await proxyTicketmasterApi(endpoint, queryParams);
    return new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to fetch data from Ticketmaster' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
