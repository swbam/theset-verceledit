import { NextApiRequest, NextApiResponse } from 'next';
import { createServerSupabaseClient } from '@/integrations/supabase/utils';

interface SearchResult {
  id: string;
  name: string;
  image_url?: string | null;
  url?: string | null;
  external_id?: string;
  exists_in_db?: boolean;
  db_id?: string | null;
}

interface VenueResult {
  id: string;
  name: string;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  address?: string | null;
  url?: string | null;
  external_id?: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Content-Type', 'application/json');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { query, type } = req.query;

  if (!query || !type) {
    res.setHeader('Content-Type', 'application/json');
    return res.status(400).json({ error: 'Missing required parameters: query and type' });
  }

  try {
    const supabase = createServerSupabaseClient({ req, res });
    
    // Check if user is authenticated and is an admin
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      res.setHeader('Content-Type', 'application/json');
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    // Check if user is an admin
    const { data: adminCheck } = await supabase
      .from('admins')
      .select('user_id')
      .eq('user_id', session.user.id)
      .single();
      
    if (!adminCheck) {
      res.setHeader('Content-Type', 'application/json');
      return res.status(403).json({ error: 'Forbidden: Admin access required' });
    }

    let results: SearchResult[] | VenueResult[] = [];
    
    if (type === 'artist') {
      // Search for artists using Ticketmaster API
      const tmApiKey = process.env.TICKETMASTER_API_KEY;
      if (!tmApiKey) {
        throw new Error('Server configuration error: Ticketmaster API key is not configured');
      }
      
      const searchUrl = `https://app.ticketmaster.com/discovery/v2/attractions.json?keyword=${encodeURIComponent(query as string)}&apikey=${tmApiKey}`;
      console.log(`Fetching artists from: ${searchUrl}`);
      const response = await fetch(searchUrl);
      
      if (!response.ok) {
        const errorBody = await response.text();
        console.error(`Ticketmaster API error (${response.status}): ${errorBody}`);
        throw new Error(`Ticketmaster API error: ${response.statusText} - ${errorBody}`); 
      }
      
      const data = await response.json();
      
      if (data._embedded && data._embedded.attractions) {
        results = data._embedded.attractions.map((attraction: any) => ({
          id: attraction.id,
          name: attraction.name,
          image_url: attraction.images && attraction.images.length > 0 
            ? attraction.images.find((img: any) => img.ratio === '16_9')?.url || attraction.images[0].url 
            : null,
          url: attraction.url || null,
          external_id: attraction.id
        }));
      }
      
      // Also check if any of these artists already exist in our database
      if (results.length > 0) {
        const ids = results.map(r => r.id);
        const { data: existingArtists } = await supabase
          .from('artists')
          .select('ticketmaster_id, id')
          .in('ticketmaster_id', ids);
          
        // Mark artists that already exist in our database
        if (existingArtists && existingArtists.length > 0) {
          const existingMap = new Map(existingArtists.map(a => [a.ticketmaster_id, a.id]));
          
          results = results.map(artist => ({
            ...artist,
            exists_in_db: existingMap.has(artist.id),
            db_id: existingMap.get(artist.id) || null
          }));
        }
      }
    } else if (type === 'venue') {
      // Search for venues using Ticketmaster API
      const tmApiKey = process.env.TICKETMASTER_API_KEY;
      if (!tmApiKey) {
        throw new Error('Server configuration error: Ticketmaster API key is not configured');
      }
      
      const searchUrl = `https://app.ticketmaster.com/discovery/v2/venues.json?keyword=${encodeURIComponent(query as string)}&apikey=${tmApiKey}`;
      console.log(`Fetching venues from: ${searchUrl}`);
      const response = await fetch(searchUrl);
      
      if (!response.ok) {
        const errorBody = await response.text();
        console.error(`Ticketmaster API error (${response.status}): ${errorBody}`);
        throw new Error(`Ticketmaster API error: ${response.statusText} - ${errorBody}`);
      }
      
      const data = await response.json();
      
      if (data._embedded && data._embedded.venues) {
        results = data._embedded.venues.map((venue: any) => ({
          id: venue.id,
          name: venue.name,
          city: venue.city?.name || null,
          state: venue.state?.name || null,
          country: venue.country?.name || null,
          address: venue.address?.line1 || null,
          url: venue.url || null,
          external_id: venue.id
        }));
      }
    }

    res.setHeader('Content-Type', 'application/json');
    return res.status(200).json({ results });
  } catch (error) {
    console.error('Search API error:', error);
    res.setHeader('Content-Type', 'application/json'); 
    return res.status(500).json({ 
      error: `Search failed: ${error instanceof Error ? error.message : 'An unknown server error occurred'}` 
    });
  }
}
