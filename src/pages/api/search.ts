import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@/lib/db';

interface Artist {
  id: string;
  name: string;
  image_url?: string | null;
  url?: string | null;
  ticketmaster_id: string;
}

interface Venue {
  id: string;
  name: string;
  city?: string | null;
  state?: string | null;
  ticketmaster_id: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { type, query } = req.query;

  if (!type || !query) {
    return res.status(400).json({
      error: 'Missing required parameters'
    });
  }

  let results: any[] = [];

  try {
    // First check database for existing entities
    if (type === 'artist') {
      const { data: existingArtists, error: dbError } = await supabase
        .from('artists')
        .select('*')
        .ilike('name', `%${query}%`)
        .limit(10);

      if (dbError) throw dbError;

      if (existingArtists && existingArtists.length > 0) {
        results = existingArtists.map(artist => ({
          id: artist.id,
          name: artist.name,
          image_url: artist.image_url,
          url: artist.url,
          ticketmaster_id: artist.ticketmaster_id
        }));
        return res.status(200).json({ results });
      }
    }
    
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
          ticketmaster_id: attraction.id
        }));
      }
    }

    return res.status(200).json({ results });

  } catch (err: unknown) {
    console.error('Error in search API:', err);
    let errorMessage = "Unknown error";
    if (err instanceof Error) {
      errorMessage = err.message;
    }
    return res.status(500).json({ error: errorMessage });
  }
}
