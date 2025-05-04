import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { createClient } from '@supabase/supabase-js';

interface SyncShowRequest {
  showId: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const input: SyncShowRequest = await req.json();
    console.log('[sync-show] Received request:', input);

    if (!input.showId) {
      throw new Error('Show ID is required');
    }

    // Call the unified-sync function to handle the show sync
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: syncResult, error: syncError } = await supabaseClient.functions.invoke('unified-sync', {
      body: {
        entityType: 'show',
        ticketmasterId: input.showId,
        options: {
          skipDependencies: false,
          forceRefresh: true
        }
      }
    });

    if (syncError) {
      console.error('[sync-show] Error syncing show:', syncError);
      throw syncError;
    }

    if (!syncResult?.success) {
      console.error('[sync-show] Sync failed:', syncResult);
      throw new Error(syncResult?.error || 'Sync failed');
    }

    console.log('[sync-show] Successfully synced show:', syncResult);

    return new Response(JSON.stringify({
      success: true,
      show: syncResult.show
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });

  } catch (error) {
    console.error('[sync-show] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'An unknown error occurred'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400
    });
  }
});
