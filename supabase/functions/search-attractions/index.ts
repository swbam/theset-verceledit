import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { retryableFetch } from '../_shared/retry.ts';

interface SearchRequest {
  keyword: string;
  size?: number;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const input: SearchRequest = await req.json();
    console.log('[search-attractions] Received request:', input);

    if (!input.keyword) {
      throw new Error('Search keyword is required');
    }

    const apiKey = Deno.env.get('TICKETMASTER_API_KEY');
    if (!apiKey) {
      throw new Error('TICKETMASTER_API_KEY not configured');
    }

    const response = await retryableFetch(async () => {
      // Search for music attractions with upcoming events
      const url = `https://app.ticketmaster.com/discovery/v2/attractions.json?apikey=${apiKey}&keyword=${encodeURIComponent(input.keyword)}&classificationName=music&size=${input.size || 10}&hasUpcomingEvents=yes`;
      console.log(`[search-attractions] Requesting URL: ${url}`);

      const result = await fetch(url, {
        headers: { 'Accept': 'application/json' }
      });

      if (!result.ok) {
        const errorBody = await result.text();
        console.error(`[search-attractions] Ticketmaster API error response: ${errorBody}`);
        throw new Error(`Ticketmaster API error: ${result.status} ${result.statusText}`);
      }

      return result.json();
    }, { retries: 3 });

    if (!response._embedded?.attractions) {
      console.log('[search-attractions] No attractions found');
      return new Response(JSON.stringify({
        artists: []
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      });
    }

    // Map response to expected format
    const artists = response._embedded.attractions.map((attraction: any) => {
      // Get best image
      let image;
      if (attraction.images && attraction.images.length > 0) {
        const sortedImages = [...attraction.images].sort((a: any, b: any) => (b.width || 0) - (a.width || 0));
        image = sortedImages[0]?.url;
      }

      // Get upcoming shows count
      const upcomingShows = attraction.upcomingEvents?._total || 0;

      // Get genres
      let genres: string[] = [];
      if (attraction.classifications?.[0]) {
        const classification = attraction.classifications[0];
        genres = [classification.genre?.name, classification.subGenre?.name].filter(Boolean) as string[];
      }

      return {
        id: attraction.id,
        name: attraction.name,
        image,
        upcomingShows,
        genres,
        url: attraction.url
      };
    });

    console.log(`[search-attractions] Found ${artists.length} artists`);

    return new Response(JSON.stringify({
      artists
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });

  } catch (error) {
    console.error('[search-attractions] Error:', error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'An unknown error occurred'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400
    });
  }
});
