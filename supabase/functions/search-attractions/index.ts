/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />
/// <reference lib="deno.ns" />

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';

interface Payload {
  keyword: string;
  size?: number;
}

serve(async (req: Request) => {
  // CORS pre‑flight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { keyword, size = 10 } = (await req.json()) as Payload;

    if (!keyword) {
      return new Response(
        JSON.stringify({ error: 'keyword is required' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        },
      );
    }

    const apiKey = Deno.env.get('TICKETMASTER_API_KEY');
    if (!apiKey) {
      throw new Error('Missing TICKETMASTER_API_KEY');
    }

    const url =
      `https://app.ticketmaster.com/discovery/v2/attractions.json?apikey=${apiKey}&keyword=${encodeURIComponent(keyword)}&size=${size}`;

    const upstreamResp = await fetch(url, { headers: { Accept: 'application/json' } });

    if (!upstreamResp.ok) {
      const text = await upstreamResp.text();
      return new Response(
        JSON.stringify({
          error: `Ticketmaster API error ${upstreamResp.status}`,
          details: text,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: upstreamResp.status,
        },
      );
    }

    const data = await upstreamResp.json();

    const artists = (data._embedded?.attractions ?? []).map((attr: any) => {
      const image = Array.isArray(attr.images) && attr.images.length
        ? [...attr.images].sort((a: any, b: any) => (b.width || 0) - (a.width || 0))[0].url
        : null;

      const upcomingShows = attr.upcomingEvents?._total ?? 0;

      const genres = (() => {
        if (attr.classifications && attr.classifications.length > 0) {
          const c = attr.classifications[0];
          return [c.genre?.name, c.subGenre?.name].filter(Boolean);
        }
        return [];
      })();

      return {
        id: attr.id,
        name: attr.name,
        image,
        upcomingShows,
        genres,
        url: attr.url,
      };
    });

    return new Response(
      JSON.stringify({ artists }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(
      JSON.stringify({ error: message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 },
    );
  }
});
