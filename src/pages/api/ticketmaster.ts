import { NextApiRequest, NextApiResponse } from 'next';

// Ticketmaster API base URL
const TICKETMASTER_BASE_URL = 'https://app.ticketmaster.com/discovery/v2/';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight request
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get API key from environment variables
    const apiKey = process.env.TICKETMASTER_API_KEY;
    if (!apiKey) {
      console.error('Ticketmaster API key is not configured');
      return res.status(500).json({ error: 'Ticketmaster API key is not configured' });
    }

    // Extract endpoint from query parameters
    const { endpoint, ...restParams } = req.query;
    if (!endpoint || typeof endpoint !== 'string') {
      return res.status(400).json({ error: 'Missing required parameter: endpoint' });
    }

    // Build the URL for the Ticketmaster API
    const url = new URL(endpoint, TICKETMASTER_BASE_URL);
    
    // Add API key
    url.searchParams.append('apikey', apiKey);
    
    // Add all other query parameters
    Object.entries(restParams).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        // Handle array parameters
        value.forEach(v => url.searchParams.append(key, v));
      } else if (value !== undefined) {
        url.searchParams.append(key, value as string);
      }
    });

    console.log(`Proxying request to Ticketmaster API: ${url.toString()}`);
    
    // Make the request to Ticketmaster API
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    // Get response data
    const data = await response.json();

    // Forward the response
    res.status(response.status).json(data);
  } catch (error) {
    console.error('Error proxying request to Ticketmaster API:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
