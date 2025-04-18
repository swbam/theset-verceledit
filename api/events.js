// Vercel serverless function for Ticketmaster events API
module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
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
      console.error('[API/events] Ticketmaster API key is not configured');
      return res.status(500).json({ error: 'Ticketmaster API key is not configured' });
    }

    // Extract query parameters (artistId, venueId, keyword, etc.)
    const { attractionId, venueId, keyword, size = '20', sort = 'date,asc', ...restParams } = req.query;
    
    // Build the URL for the Ticketmaster API
    const TICKETMASTER_BASE_URL = 'https://app.ticketmaster.com/discovery/v2/events.json';
    const url = new URL(TICKETMASTER_BASE_URL);
    
    // Add API key
    url.searchParams.append('apikey', apiKey);
    
    // Add filters based on query parameters
    if (attractionId) {
      url.searchParams.append('attractionId', attractionId);
    }
    
    if (venueId) {
      url.searchParams.append('venueId', venueId);
    }
    
    if (keyword) {
      url.searchParams.append('keyword', keyword);
    }
    
    // Add common parameters
    url.searchParams.append('size', size);
    url.searchParams.append('sort', sort);
    
    // Add segment name for filtering music events
    url.searchParams.append('segmentName', 'Music');
    
    // Add all other query parameters
    Object.entries(restParams).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        value.forEach(v => url.searchParams.append(key, v));
      } else if (value !== undefined) {
        url.searchParams.append(key, value);
      }
    });

    console.log(`[API/events] Proxying request to: ${url.toString().replace(apiKey, 'API_KEY_REDACTED')}`);
    
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
      console.error(`[API/events] API error (${response.status}): ${errorBody}`);
      return res.status(response.status).json({ 
        error: `Ticketmaster API error: ${response.statusText}`,
        details: errorBody
      });
    }

    const data = await response.json();
    console.log(`[API/events] Successful response with ${data._embedded?.events?.length || 0} events`);
    
    // Add cache headers for successful responses
    res.setHeader('Cache-Control', 'public, max-age=300, stale-while-revalidate=60'); // Cache for 5 minutes
    
    // Forward the response
    res.status(200).json(data);
  } catch (error) {
    console.error('[API/events] Error:', error);
    res.status(500).json({ 
      error: 'Internal server error', 
      details: error.message || String(error)
    });
  }
}; 