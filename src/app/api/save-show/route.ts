import { adminClient } from '@/lib/db';
import { supabase } from '@/integrations/supabase/client';

export async function POST(request: Request) {
  try {
    const showPayload = await request.json();

    // Validate payload
    if (!showPayload || !showPayload.id || !showPayload.artist_id || !showPayload.venue_id) {
      return new Response(JSON.stringify({ success: false, error: 'Invalid show data provided. Required fields: id, artist_id, venue_id' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 1. Sync Artist
    console.log(`[API/save-show] Syncing artist ${showPayload.artist_id}`);
    const artistResult = await supabase.functions.invoke('sync-artist', {
      body: { artistId: showPayload.artist_id }
    });

    if (!artistResult.data?.success) {
      console.error(`[API/save-show] Artist sync failed:`, artistResult.error);
    }

    // 2. Sync Venue
    console.log(`[API/save-show] Syncing venue ${showPayload.venue_id}`);
    const venueResult = await supabase.functions.invoke('sync-venue', {
      body: { venueId: showPayload.venue_id }
    });

    if (!venueResult.data?.success) {
      console.error(`[API/save-show] Venue sync failed:`, venueResult.error);
    }

    // 3. Sync Show
    console.log(`[API/save-show] Syncing show ${showPayload.id}`);
    const showResult = await supabase.functions.invoke('sync-show', {
      body: { 
        showId: showPayload.id,
        payload: showPayload // Pass full payload for additional context
      }
    });

    if (!showResult.data?.success) {
      throw new Error(showResult.error?.message || 'Show sync failed');
    }

    console.log(`[API/save-show] Successfully synced show ${showPayload.id}`);

    return new Response(JSON.stringify({ 
      success: true, 
      message: `Show ${showPayload.id} synced successfully`,
      data: showResult.data
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[API/save-show] Error processing request:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Internal server error', 
      details: errorMessage 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
