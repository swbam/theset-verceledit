/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

interface SyncShowPayload {
  showId: string;
  force?: boolean;
}

interface Show {
  id?: string;
  ticketmaster_id: string;
  name: string;
  date?: string | null;
  artist_id?: string | null;
  venue_id?: string | null;
  ticket_url?: string | null;
  image_url?: string | null;
  popularity?: number | null;
  created_at?: string;
  updated_at?: string;
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
    const tmApiKey = Deno.env.get('TICKETMASTER_API_KEY');
    if (!tmApiKey) {
      console.error('TICKETMASTER_API_KEY not set in environment variables.');
      if (!show) return null;
    } else {
      try {
        const tmUrl = `https://app.ticketmaster.com/discovery/v2/events/${showId}.json?apikey=${tmApiKey}`;
        console.log(`Fetching from Ticketmaster: ${tmUrl}`);
        const tmResponse = await fetch(tmUrl);

        if (!tmResponse.ok) {
          console.warn(`Ticketmaster API error for show ${showId}: ${tmResponse.status} ${await tmResponse.text()}`);
          if (!show) return null;
        } else {
          const tmData = await tmResponse.json();
          console.log(`Received Ticketmaster data for show ${showId}`);

          const tmArtistId = tmData._embedded?.attractions?.[0]?.id;
          const tmVenueId = tmData._embedded?.venues?.[0]?.id;
          const artistName = tmData._embedded?.attractions?.[0]?.name;

          // First sync artist and venue to get their IDs
          let artistDbId = null;
          let venueDbId = null;

          if (tmArtistId && artistName) {
            console.log(`Syncing artist ${artistName} (${tmArtistId})...`);
            try {
              const artistResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/sync-artist`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
                },
                body: JSON.stringify({ artistId: tmArtistId })
              });

              const artistResponseText = await artistResponse.text();
              if (!artistResponse.ok) {
                console.error(`Failed to sync artist: ${artistResponse.status} ${artistResponseText}`);
              } else {
                try {
                  const artistData = JSON.parse(artistResponseText);
                  if (artistData?.data?.id) {
                    artistDbId = artistData.data.id;
                    console.log(`Got artist DB ID: ${artistDbId}`);
                  }
                } catch (parseError) {
                  console.error("Error parsing artist response:", parseError);
                }
              }
            } catch (artistError) {
              console.error("Error syncing artist:", artistError);
            }
          }

          if (tmVenueId) {
            console.log("Syncing venue...");
            try {
              const venueResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/sync-venue`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
                },
                body: JSON.stringify({ venueId: tmVenueId })
              });

              const venueResponseText = await venueResponse.text();
              if (!venueResponse.ok) {
                console.error(`Failed to sync venue: ${venueResponse.status} ${venueResponseText}`);
              } else {
                try {
                  const venueData = JSON.parse(venueResponseText);
                  if (venueData?.data?.id) {
                    venueDbId = venueData.data.id;
                    console.log(`Got venue DB ID: ${venueDbId}`);
                  }
                } catch (parseError) {
                  console.error("Error parsing venue response:", parseError);
                }
              }
            } catch (venueError) {
              console.error("Error syncing venue:", venueError);
            }
          }

          if (show) {
            show.name = tmData.name;
            show.date = tmData.dates?.start?.dateTime || show.date || null;
            show.ticket_url = tmData.url || show.ticket_url || null;
            show.image_url = getBestImage(tmData.images) || show.image_url || null;
            show.popularity = show.popularity ?? 0;
            show.updated_at = new Date().toISOString();
            show.artist_id = artistDbId || show.artist_id;
            show.venue_id = venueDbId || show.venue_id;
          } else {
            show = {
              ticketmaster_id: showId,
              name: tmData.name,
              date: tmData.dates?.start?.dateTime || null,
              ticket_url: tmData.url || null,
              image_url: getBestImage(tmData.images) || null,
              popularity: 0,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              artist_id: artistDbId,
              venue_id: venueDbId
            };
          }
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error(`Error fetching or processing Ticketmaster data for show ${showId}:`, errorMsg);
        if (!show) return null;
      }
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`Error in fetchAndTransformShowData: ${errorMsg}`);
    return null;
  }

  if (!show?.name) {
    console.error(`Failed to resolve show name for ID ${showId} from any source.`);
    return null;
  }

  return show;
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
    const payload: SyncShowPayload = await req.json();
    const { showId } = payload;

    if (!showId) {
      return new Response(JSON.stringify({ error: 'Missing showId in request body' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    console.log(`Sync request received for show: ${showId}`);

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const showData = await fetchAndTransformShowData(supabaseAdmin, showId);

    if (!showData) {
      console.error(`Failed to fetch or transform data for show ${showId}`);
      return new Response(JSON.stringify({ error: 'Failed to fetch show data from external APIs' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      })
    }

    console.log(`Upserting show ${showId} into database...`);
    const { data: upsertedData, error: upsertError } = await supabaseAdmin
      .from('shows')
      .upsert(showData, { onConflict: 'ticketmaster_id' })
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
    await updateSyncStatus(supabaseAdmin, showId, 'show');

    console.log(`Successfully synced show ${showId}`);

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