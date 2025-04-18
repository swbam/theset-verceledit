/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />
/// <reference lib="deno.ns" />

// @deno-types="https://raw.githubusercontent.com/denoland/deno/main/cli/dts/lib.deno.d.ts"

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

declare global {
  interface Window {
    Deno: {
      env: {
        get(key: string): string | undefined;
      };
    };
  }
}

const deno = (globalThis as any).Deno;

interface SyncShowPayload {
  showId: string;
  force?: boolean;
}

interface Show {
  id?: string;
  ticketmaster_id: string;
  name: string;
  date: string | null;
  artist_id: string | null;
  venue_id: string | null;
  ticket_url: string | null;
  image_url: string | null;
  popularity: number | null;
  created_at?: string;
  updated_at: string;
}

interface TicketmasterEvent {
  id: string;
  name: string;
  url?: string;
  dates?: {
    start?: {
      dateTime?: string;
    };
  };
  images?: Array<{
    url: string;
    width: number;
    height: number;
    ratio?: string;
  }>;
  _embedded?: {
    venues?: Array<{
      id: string;
      name: string;
    }>;
    attractions?: Array<{
      id: string;
      name: string;
    }>;
  };
  popularity?: number;
}

function getBestImage(images?: Array<{url: string, width: number, height: number}>): string | null {
  if (!images || images.length === 0) return null;
  const sorted = [...images].sort((a, b) => (b.width || 0) - (a.width || 0));
  return sorted[0].url;
}

async function fetchAndTransformShowData(supabaseAdmin: any, showId: string): Promise<Show | null> {
  console.log(`Fetching data for show ${showId}`);
  let show: Show | null = null;

  try {
    // Try to find by ticketmaster_id first
    const { data: existingShow, error: existingError } = await supabaseAdmin
      .from('shows')
      .select('*')
      .eq('ticketmaster_id', showId)
      .maybeSingle();

    if (existingError) {
      console.warn(`Error fetching existing show with ticketmaster_id ${showId}:`, existingError.message);
    }
    
    if (existingShow) {
      console.log(`Found existing data for show with ticketmaster_id ${showId}`);
      show = existingShow as Show;
    }

    // --- Ticketmaster API ---
    const tmApiKey = deno.env.get('TICKETMASTER_API_KEY');
    if (!tmApiKey) {
      throw new Error('TICKETMASTER_API_KEY not set in environment variables.');
    }

    const tmUrl = `https://app.ticketmaster.com/discovery/v2/events/${showId}.json?apikey=${tmApiKey}`;
    console.log(`Fetching from Ticketmaster: ${tmUrl}`);
    const tmResponse = await fetch(tmUrl);

    if (!tmResponse.ok) {
      const responseText = await tmResponse.text();
      throw new Error(`Ticketmaster API error (${tmResponse.status}): ${responseText}`);
    }

    const tmData = await tmResponse.json() as TicketmasterEvent;
    console.log(`Received Ticketmaster data for show ${showId}`);

    const tmArtistId = tmData._embedded?.attractions?.[0]?.id;
    const tmVenueId = tmData._embedded?.venues?.[0]?.id;
    const artistName = tmData._embedded?.attractions?.[0]?.name;

    if (!tmArtistId || !artistName) {
      throw new Error(`No artist data found for show ${showId}`);
    }

    if (!tmData._embedded?.venues?.[0]) {
      throw new Error(`No venue data found for show ${showId}`);
    }

    const venueName = tmData._embedded.venues[0].name;

    // First sync artist and venue to get their IDs
    let artistDbId: string | null = null;
    let venueDbId: string | null = null;

    // Sync artist
    console.log(`Syncing artist ${artistName} (${tmArtistId})...`);
    const artistResponse = await fetch(`${deno.env.get('SUPABASE_URL')}/functions/v1/sync-artist`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
      },
      body: JSON.stringify({ artistId: tmArtistId })
    });

    if (!artistResponse.ok) {
      const artistResponseText = await artistResponse.text();
      throw new Error(`Artist sync failed: ${artistResponse.status} ${artistResponseText}`);
    }

    const artistData = await artistResponse.json();
    if (!artistData?.data?.id) {
      throw new Error('Artist sync succeeded but no ID returned');
    }

    artistDbId = artistData.data.id;
    console.log(`Got artist DB ID: ${artistDbId}`);

    // Sync venue
    console.log(`Syncing venue ${venueName} (${tmVenueId})...`);
    const venueResponse = await fetch(`${deno.env.get('SUPABASE_URL')}/functions/v1/sync-venue`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
      },
      body: JSON.stringify({ venueId: tmVenueId })
    });

    if (!venueResponse.ok) {
      const venueResponseText = await venueResponse.text();
      throw new Error(`Venue sync failed: ${venueResponse.status} ${venueResponseText}`);
    }

    const venueData = await venueResponse.json();
    if (!venueData?.data?.id) {
      throw new Error('Venue sync succeeded but no ID returned');
    }

    venueDbId = venueData.data.id;
    console.log(`Got venue DB ID: ${venueDbId}`);

    // Transform the show data
    const transformedShow: Show = {
      ticketmaster_id: showId,
      name: tmData.name,
      date: tmData.dates?.start?.dateTime || null,
      artist_id: artistDbId,
      venue_id: venueDbId,
      ticket_url: tmData.url || null,
      image_url: getBestImage(tmData.images) || null,
      popularity: tmData.popularity || null,
      updated_at: new Date().toISOString()
    };

    // If we found an existing show, update it
    if (show?.id) {
      console.log(`Updating existing show ${show.id}...`);
      const { error: updateError } = await supabaseAdmin
        .from('shows')
        .update(transformedShow)
        .eq('id', show.id);

      if (updateError) {
        throw new Error(`Failed to update show: ${updateError.message}`);
      }

      return { ...transformedShow, id: show.id };
    }

    // Otherwise insert new show
    console.log('Inserting new show...');
    const { data: newShow, error: insertError } = await supabaseAdmin
      .from('shows')
      .insert(transformedShow)
      .select()
      .single();

    if (insertError) {
      throw new Error(`Failed to insert show: ${insertError.message}`);
    }

    return newShow;

  } catch (error) {
    console.error(`Error processing show ${showId}:`, error);
    throw error instanceof Error ? error : new Error('Unknown error occurred');
  }
}

// Update sync state in database
async function updateSyncStatus(supabaseAdmin: any, entityId: string, entityType: string) {
  try {
    const { error } = await supabaseAdmin
      .from('sync_states')
      .upsert({
        entity_id: entityId,
        entity_type: entityType,
        last_synced: new Date().toISOString()
      }, {
        onConflict: 'entity_id,entity_type'
      });

    if (error) throw error;
  } catch (error) {
    console.error(`Failed to update sync status for ${entityType} ${entityId}:`, error);
  }
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      deno.env.get('SUPABASE_URL') ?? '',
      deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { showId, force = false } = await req.json() as SyncShowPayload;

    if (!showId) {
      throw new Error('showId is required');
    }

    // Check if we've synced this show recently
    if (!force) {
      const { data: syncState } = await supabaseClient
        .from('sync_states')
        .select('last_synced')
        .eq('entity_id', showId)
        .eq('entity_type', 'show')
        .maybeSingle();

      if (syncState?.last_synced) {
        const lastSync = new Date(syncState.last_synced);
        const now = new Date();
        const hoursSinceSync = (now.getTime() - lastSync.getTime()) / (1000 * 60 * 60);

        if (hoursSinceSync < 24) {
          console.log(`Show ${showId} was synced ${hoursSinceSync.toFixed(1)} hours ago, skipping...`);
          return new Response(
            JSON.stringify({
              message: 'Show was synced recently',
              data: null,
              error: null
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
          )
        }
      }
    }

    const show = await fetchAndTransformShowData(supabaseClient, showId);

    // Update sync state
    await updateSyncStatus(supabaseClient, showId, 'show');

    return new Response(
      JSON.stringify({
        message: show ? 'Show synced successfully' : 'Failed to sync show',
        data: show,
        error: null
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({
        message: 'Error syncing show',
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})