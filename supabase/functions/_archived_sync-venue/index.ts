import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { createClient } from '@supabase/supabase-js';

interface SyncVenueRequest {
  venueId: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const input: SyncVenueRequest = await req.json();
    console.log('[sync-venue] Received request:', input);

    if (!input.venueId) {
      throw new Error('Venue ID is required');
    }

    // Call the unified-sync function to handle the venue sync
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: syncResult, error: syncError } = await supabaseClient.functions.invoke('unified-sync', {
      body: {
        entityType: 'venue',
        ticketmasterId: input.venueId,
        options: {
          skipDependencies: false,
          forceRefresh: true
        }
      }
    });

    if (syncError) {
      console.error('[sync-venue] Error syncing venue:', syncError);
      throw syncError;
    }

    if (!syncResult?.success) {
      console.error('[sync-venue] Sync failed:', syncResult);
      throw new Error(syncResult?.error || 'Sync failed');
    }

    console.log('[sync-venue] Successfully synced venue:', syncResult);

    return new Response(JSON.stringify({
      success: true,
      venue: syncResult.venue
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });

  } catch (error) {
    console.error('[sync-venue] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'An unknown error occurred'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400
    });
  }
});
