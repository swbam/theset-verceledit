/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

interface SyncVenuePayload {
  venueId: string;
  force?: boolean;
}

interface Venue {
  id?: string;
  ticketmaster_id: string;
  name: string;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  url?: string | null;
  image_url?: string | null;
  created_at?: string;
  updated_at?: string;
}

function getBestImage(images?: Array<{url: string, width: number, height: number}>): string | null {
  if (!images || images.length === 0) return null;
  const sorted = [...images].sort((a, b) => (b.width || 0) - (a.width || 0));
  return sorted[0].url;
}

async function fetchAndTransformVenueData(supabaseAdmin: any, venueId: string): Promise<Venue | null> {
  console.log(`Fetching data for venue ${venueId}`);
  let venue: Venue | null = null;

  try {
    const { data: existingVenue, error: existingError } = await supabaseAdmin
      .from('venues')
      .select('*')
      .eq('ticketmaster_id', venueId)
      .maybeSingle();

    if (existingError) {
      console.warn(`Error fetching existing venue ${venueId}:`, existingError.message);
    }
    if (existingVenue) {
      console.log(`Found existing data for venue ${venueId}`);
      venue = existingVenue as Venue;
    }

    const tmApiKey = Deno.env.get('TICKETMASTER_API_KEY');
    if (!tmApiKey) {
      console.error('TICKETMASTER_API_KEY not set in environment variables.');
      if (!venue) return null;
    } else {
      try {
        const tmUrl = `https://app.ticketmaster.com/discovery/v2/venues/${venueId}.json?apikey=${tmApiKey}`;
        console.log(`Fetching from Ticketmaster: ${tmUrl}`);
        const tmResponse = await fetch(tmUrl);

        if (!tmResponse.ok) {
          console.warn(`Ticketmaster API error for venue ${venueId}: ${tmResponse.status} ${await tmResponse.text()}`);
          if (!venue) return null;
        } else {
          const tmData = await tmResponse.json();
          console.log(`Received Ticketmaster data for venue ${venueId}`);

          const address = [
            tmData.address?.line1,
            tmData.city?.name
          ].filter(Boolean).join(', ');

          if (venue) {
            venue.name = tmData.name;
            venue.city = tmData.city?.name || venue.city || null;
            venue.state = tmData.state?.stateCode || venue.state || null;
            venue.country = tmData.country?.countryCode || venue.country || null;
            venue.address = address || venue.address || null;
            venue.latitude = typeof tmData.location?.latitude === 'string' ? parseFloat(tmData.location.latitude) : (tmData.location?.latitude ?? venue.latitude ?? null);
            venue.longitude = typeof tmData.location?.longitude === 'string' ? parseFloat(tmData.location.longitude) : (tmData.location?.longitude ?? venue.longitude ?? null);
            venue.url = tmData.url || venue.url || null;
            venue.image_url = getBestImage(tmData.images) || venue.image_url || null;
            venue.updated_at = new Date().toISOString();
          } else {
            venue = {
              ticketmaster_id: venueId,
              name: tmData.name,
              city: tmData.city?.name || null,
              state: tmData.state?.stateCode || null,
              country: tmData.country?.countryCode || null,
              address: address || null,
              latitude: typeof tmData.location?.latitude === 'string' ? parseFloat(tmData.location.latitude) : (tmData.location?.latitude ?? null),
              longitude: typeof tmData.location?.longitude === 'string' ? parseFloat(tmData.location.longitude) : (tmData.location?.longitude ?? null),
              url: tmData.url || null,
              image_url: getBestImage(tmData.images) || null,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            };
          }
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error(`Error fetching or processing Ticketmaster data for venue ${venueId}:`, errorMsg);
        if (!venue) return null;
      }
    }

    if (!venue?.name) {
      console.error(`Failed to resolve venue name for ID ${venueId} from any source.`);
      return null;
    }

    return venue;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`Error in fetchAndTransformVenueData: ${errorMsg}`);
    return null;
  }
}

// Update sync state in database
async function updateSyncStatus(client: any, entityId: string, entityType: string) {
  try {
    const now = new Date().toISOString();
    const { error } = await client
      .from('sync_states')
      .upsert({
        entity_id: entityId,
        entity_type: entityType,
        external_id: null,
        last_synced: now,
        sync_version: 1
      }, {
        onConflict: 'entity_id,entity_type'
      });

    if (error) {
      console.error(`Error updating sync state for ${entityType} ${entityId}:`, error);
    } else {
      console.log(`Updated sync state for ${entityType} ${entityId}`);
    }
  } catch (error) {
    console.error(`Exception updating sync state for ${entityType} ${entityId}:`, error);
  }
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const payload: SyncVenuePayload = await req.json();
    const { venueId } = payload;

    if (!venueId) {
      return new Response(JSON.stringify({ error: 'Missing venueId in request body' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    console.log(`Sync request received for venue: ${venueId}`);

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const venueData = await fetchAndTransformVenueData(supabaseAdmin, venueId);

    if (!venueData) {
      console.error(`Failed to fetch or transform data for venue ${venueId}`);
      return new Response(JSON.stringify({ error: 'Failed to fetch venue data from external APIs' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      })
    }

    console.log(`Upserting venue ${venueId} into database...`);
    const { id: venueUUID, ...upsertData } = venueData;

    const { data: upsertedData, error: upsertError } = await supabaseAdmin
      .from('venues')
      .upsert(upsertData, {
        onConflict: 'ticketmaster_id',
        ignoreDuplicates: false
      })
      .select()
      .single();

    if (upsertError) {
      console.error('Supabase upsert error:', upsertError);
      return new Response(JSON.stringify({ error: 'Database error during upsert', details: upsertError.message }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      })
    }

    // Added: Update sync state after successful upsert
    await updateSyncStatus(supabaseAdmin, venueId, 'venue');

    console.log(`Successfully synced venue ${venueId}`);

    return new Response(JSON.stringify({ success: true, data: upsertedData }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('Unhandled error:', errorMessage, error);
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})