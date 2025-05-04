import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { createClient } from '@supabase/supabase-js';

interface SyncArtistRequest {
  artistId: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const input: SyncArtistRequest = await req.json();
    console.log('[sync-artist] Received request:', input);

    if (!input.artistId) {
      throw new Error('Artist ID is required');
    }

    // Call the unified-sync function to handle the artist sync
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: syncResult, error: syncError } = await supabaseClient.functions.invoke('unified-sync', {
      body: {
        entityType: 'artist',
        ticketmasterId: input.artistId,
        options: {
          skipDependencies: false,
          forceRefresh: true
        }
      }
    });

    if (syncError) {
      console.error('[sync-artist] Error syncing artist:', syncError);
      throw syncError;
    }

    if (!syncResult?.success) {
      console.error('[sync-artist] Sync failed:', syncResult);
      throw new Error(syncResult?.error || 'Sync failed');
    }

    console.log('[sync-artist] Successfully synced artist:', syncResult);

    return new Response(JSON.stringify({
      success: true,
      artist: syncResult.artist
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });

  } catch (error) {
    console.error('[sync-artist] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'An unknown error occurred'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400
    });
  }
});
