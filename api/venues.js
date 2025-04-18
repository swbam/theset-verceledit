// Vercel serverless function for Ticketmaster venues API
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
      console.error('[API/venues] Ticketmaster API key is not configured');
      return res.status(500).json({ error: 'Ticketmaster API key is not configured' });
    }

    // Check if this is a request for a specific venue by ID
    const { id, keyword, city, stateCode, countryCode, size = '10', ...restParams } = req.query;
    
    // Build the base URL
    let apiPath = 'venues';
    if (id) {
      apiPath = `venues/${id}`;
    }
    
    // Build the URL for the Ticketmaster API
    const TICKETMASTER_BASE_URL = `https://app.ticketmaster.com/discovery/v2/${apiPath}.json`;
    const url = new URL(TICKETMASTER_BASE_URL);
    
    // Add API key
    url.searchParams.append('apikey', apiKey);
    
    // Add search parameters only if this is not a specific ID lookup
    if (!id) {
      if (keyword) {
        url.searchParams.append('keyword', keyword);
      }
      
      if (city) {
        url.searchParams.append('city', city);
      }
      
      if (stateCode) {
        url.searchParams.append('stateCode', stateCode);
      }
      
      if (countryCode) {
        url.searchParams.append('countryCode', countryCode);
      }
      
      url.searchParams.append('size', size);
    }
    
    // Add all other query parameters
    Object.entries(restParams).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        value.forEach(v => url.searchParams.append(key, v));
      } else if (value !== undefined) {
        url.searchParams.append(key, value);
      }
    });

    console.log(`[API/venues] Proxying request to: ${url.toString().replace(apiKey, 'API_KEY_REDACTED')}`);
    
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
      console.error(`[API/venues] API error (${response.status}): ${errorBody}`);
      return res.status(response.status).json({ 
        error: `Ticketmaster API error: ${response.statusText}`,
        details: errorBody
      });
    }

    const data = await response.json();
    
    if (id) {
      console.log(`[API/venues] Successful response for venue ID: ${id}`);
    } else {
      console.log(`[API/venues] Successful response with ${data._embedded?.venues?.length || 0} venues`);
    }
    
    // Add cache headers for successful responses
    res.setHeader('Cache-Control', 'public, max-age=300, stale-while-revalidate=60'); // Cache for 5 minutes
    
    // Forward the response
    res.status(200).json(data);
  } catch (error) {
    console.error('[API/venues] Error:', error);
    res.status(500).json({ 
      error: 'Internal server error', 
      details: error.message || String(error)
    });
  }
}; 