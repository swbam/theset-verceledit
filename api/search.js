// Vercel serverless function for search API
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
    // Get search parameters from query string
    const { query, type = 'artist', limit = '10' } = req.query;
    
    if (!query) {
      return res.status(400).json({ error: 'Missing required parameter: query' });
    }
    
    let results = [];
    
    // Search based on type
    if (type === 'artist') {
      // Search for artists using Ticketmaster API
      const tmApiKey = process.env.TICKETMASTER_API_KEY;
      if (!tmApiKey) {
        return res.status(500).json({ error: 'Server configuration error: Ticketmaster API key is not configured' });
      }
      
      const searchUrl = `https://app.ticketmaster.com/discovery/v2/attractions.json?keyword=${encodeURIComponent(query)}&apikey=${tmApiKey}&size=${limit}`;
      const response = await fetch(searchUrl);
      
      if (!response.ok) {
        const errorBody = await response.text();
        console.error(`Ticketmaster API error (${response.status}): ${errorBody}`);
        return res.status(response.status).json({ 
          error: `Search error: ${response.statusText}`, 
          details: errorBody 
        });
      }
      
      const data = await response.json();
      
      if (data._embedded && data._embedded.attractions) {
        results = data._embedded.attractions.map((attraction) => ({
          id: attraction.id,
          name: attraction.name,
          image_url: attraction.images && attraction.images.length > 0 
            ? attraction.images.find((img) => img.ratio === '16_9')?.url || attraction.images[0].url 
            : null,
          url: attraction.url || null,
          external_id: attraction.id
        }));
      }
    } else if (type === 'venue') {
      // Search for venues using Ticketmaster API
      const tmApiKey = process.env.TICKETMASTER_API_KEY;
      if (!tmApiKey) {
        return res.status(500).json({ error: 'Server configuration error: Ticketmaster API key is not configured' });
      }
      
      const searchUrl = `https://app.ticketmaster.com/discovery/v2/venues.json?keyword=${encodeURIComponent(query)}&apikey=${tmApiKey}&size=${limit}`;
      const response = await fetch(searchUrl);
      
      if (!response.ok) {
        const errorBody = await response.text();
        console.error(`Ticketmaster API error (${response.status}): ${errorBody}`);
        return res.status(response.status).json({ 
          error: `Search error: ${response.statusText}`, 
          details: errorBody 
        });
      }
      
      const data = await response.json();
      
      if (data._embedded && data._embedded.venues) {
        results = data._embedded.venues.map((venue) => ({
          id: venue.id,
          name: venue.name,
          city: venue.city?.name || null,
          state: venue.state?.name || null,
          country: venue.country?.name || null,
          address: venue.address?.line1 || null,
          external_id: venue.id
        }));
      }
    } else {
      return res.status(400).json({ error: `Unsupported search type: ${type}` });
    }
    
    // Add cache headers
    res.setHeader('Cache-Control', 'public, max-age=300, stale-while-revalidate=60'); // Cache for 5 minutes
    
    // Return search results
    res.status(200).json({
      results,
      type,
      query,
      total: results.length
    });
  } catch (error) {
    console.error('Search API error:', error);
    res.status(500).json({ 
      error: 'Internal server error', 
      details: error.message || String(error)
    });
  }
}; 