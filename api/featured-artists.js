// Vercel serverless function to fetch featured artists
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
      console.error('[API/featured-artists] Ticketmaster API key is not configured');
      return res.status(500).json({ error: 'Ticketmaster API key is not configured' });
    }

    // Default parameters for featured artists
    const size = req.query.size || '10';
    
    // Build request URL
    const apiUrl = `https://app.ticketmaster.com/discovery/v2/attractions.json?apikey=${apiKey}&classificationName=music&size=${size}&sort=relevance,desc`;
    
    console.log(`[API/featured-artists] Fetching featured artists from Ticketmaster API`);
    
    // Make the request to Ticketmaster API
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      timeout: 15000, // 15 second timeout
    });

    // Get response data
    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`[API/featured-artists] API error (${response.status}): ${errorBody}`);
      return res.status(response.status).json({ 
        error: `Error fetching featured artists: ${response.statusText}`,
        details: errorBody
      });
    }

    const data = await response.json();
    
    if (!data._embedded?.attractions) {
      console.error('[API/featured-artists] No attractions found in data');
      return res.status(200).json([]);
    }

    // Transform data to match the expected format
    const artists = data._embedded.attractions.map(attraction => ({
      id: attraction.id,
      name: attraction.name,
      image: attraction.images?.find(img => img.ratio === "16_9" && img.width > 500)?.url,
      upcomingShows: attraction.upcomingEvents?._total || 0,
      genres: attraction.classifications?.map(c => c.genre?.name).filter(Boolean) || [],
      url: attraction.url
    }));

    console.log(`[API/featured-artists] Successfully fetched ${artists.length} featured artists`);
    
    // Add cache headers for successful responses
    res.setHeader('Cache-Control', 'public, max-age=600, stale-while-revalidate=120'); // Cache for 10 minutes
    
    // Return the artists
    res.status(200).json(artists);
  } catch (error) {
    console.error('[API/featured-artists] Error:', error);
    res.status(500).json({ 
      error: 'Internal server error', 
      details: error.message || String(error)
    });
  }
}; 