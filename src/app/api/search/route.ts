import { supabase } from "@/integrations/supabase/client";
import { Artist } from "@/lib/types";
import { callTicketmasterApi } from "@/lib/api/ticketmaster-config";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const query = searchParams.get('query');

    if (!type || !query) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Missing required parameters: type, query'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (type !== 'artist') {
      return new Response(JSON.stringify({
        success: false,
        error: 'Only artist search is currently supported'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Search Ticketmaster for artists using server-side API call
    const data = await callTicketmasterApi('attractions.json', {
      keyword: query,
      size: '10'
    });

    if (!data._embedded?.attractions) {
      return new Response(JSON.stringify({
        success: true,
        results: []
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Filter and transform attractions
    const artists = data._embedded.attractions
      .filter((attraction: any) => {
        // Filter out tribute/cover bands
        const name = attraction.name.toLowerCase();
        const isTribute = name.includes('tribute') ||
                        name.includes('cover') ||
                        name.includes('experience') ||
                        name.includes('celebrating');
        
        const segment = attraction.classifications?.[0]?.segment?.name?.toLowerCase();
        const isAttractionSegment = segment === 'attraction' || segment === 'miscellaneous';
        
        return !isTribute && !isAttractionSegment;
      })
      .map((attraction: any) => ({
        id: attraction.id,
        name: attraction.name,
        image_url: attraction.images?.find((img: any) => img.ratio === "16_9" && img.width > 500)?.url,
        url: attraction.url,
        ticketmaster_id: attraction.id,
        exists_in_db: false,
        db_id: null
      }));

    return new Response(JSON.stringify({
      success: true,
      results: artists
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('[API/search] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return new Response(JSON.stringify({
      success: false,
      error: 'Search failed',
      details: errorMessage
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
