// Vercel serverless function for Ticketmaster API proxy
module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get API key from environment variables
    const apiKey = process.env.TICKETMASTER_API_KEY;
    if (!apiKey) {
      console.error('[API/ticketmaster] Ticketmaster API key is not configured');
      return res.status(500).json({ error: 'Ticketmaster API key is not configured' });
    }

    // Extract endpoint from query parameters
    const { endpoint, ...restParams } = req.query;
    if (!endpoint) {
      return res.status(400).json({ error: 'Missing required parameter: endpoint' });
    }

    // Build the URL for the Ticketmaster API
    const TICKETMASTER_BASE_URL = 'https://app.ticketmaster.com/discovery/v2/';
    const url = new URL(endpoint, TICKETMASTER_BASE_URL);
    
    // Add API key
    url.searchParams.append('apikey', apiKey);
    
    // Add all other query parameters
    Object.entries(restParams).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        value.forEach(v => url.searchParams.append(key, v));
      } else if (value !== undefined) {
        url.searchParams.append(key, value);
      }
    });

    console.log(`[API/ticketmaster] Proxying request to: ${url.toString().replace(apiKey, 'API_KEY_REDACTED')}`);
    
    // Make the request to Ticketmaster API
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    // Get response data
    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`[API/ticketmaster] API error (${response.status}): ${errorBody}`);
      return res.status(response.status).json({ 
        error: `Ticketmaster API error: ${response.statusText}`,
        details: errorBody
      });
    }

    const data = await response.json();
    console.log(`[API/ticketmaster] Successful response for endpoint: ${endpoint}`);
    
    // Add cache headers for successful responses
    res.setHeader('Cache-Control', 'public, max-age=300, stale-while-revalidate=60'); // Cache for 5 minutes
    
    // Forward the response
    res.status(200).json(data);
  } catch (error) {
    console.error('[API/ticketmaster] Error:', error);
    res.status(500).json({ 
      error: 'Internal server error', 
      details: error.message || String(error)
    });
  }
}; 