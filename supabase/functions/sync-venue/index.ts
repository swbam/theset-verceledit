import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { supabaseAdmin } from '../_shared/supabaseClient.ts';
import { saveShowToDatabase } from '../_shared/databaseUtils.ts';
import { fetchVenueEvents } from '../_shared/ticketmasterUtils.ts';
import type { Show, Artist, Venue } from '../_shared/types.ts';
// Using Zod for validation requires importing it via esm.sh for Deno
import { z } from 'https://esm.sh/zod@3.23.8';

console.log('Sync Venue function initializing...');

// Input schema validation
const syncVenueSchema = z.object({
  // venueId: z.string().min(1, "Venue ID (DB) is required"), // DB ID might not be known initially
  ticketmasterVenueId: z.string().min(1, "Ticketmaster Venue ID is required"),
});

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Ensure POST request
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let requestBody: { ticketmasterVenueId?: string };
    try {
      requestBody = await req.json();
    } catch (e) {
      console.error('[sync-venue] Error parsing request body:', e);
      return new Response(JSON.stringify({ error: 'Invalid request body' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate input using Zod
    const parsed = syncVenueSchema.safeParse(requestBody);
    if (!parsed.success) {
      console.error('[sync-venue] Invalid request body:', parsed.error.errors);
      return new Response(JSON.stringify({ success: false, error: 'Invalid request body', details: parsed.error.flatten() }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const ticketmasterVenueId = parsed.data.ticketmasterVenueId;
    console.log(`[sync-venue] Starting sync for Ticketmaster Venue ID: ${ticketmasterVenueId}`);

    // --- Main Sync Logic ---

    // 1. Fetch Shows from Ticketmaster using the TM ID
    console.log(`[sync-venue] Fetching events for Ticketmaster venue ID: ${ticketmasterVenueId}`);
    const fetchedShows: Show[] = await fetchVenueEvents(ticketmasterVenueId); // Use the TM ID

    if (!fetchedShows || fetchedShows.length === 0) {
      console.log(`[sync-venue] No shows found or error fetching for venue ${ticketmasterVenueId}. Sync completed.`);
      return new Response(JSON.stringify({
        success: true,
        message: 'No new or upcoming shows found for venue.',
        savedShows: 0,
        failedShows: 0
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    console.log(`[sync-venue] Fetched ${fetchedShows.length} potential shows for venue ${ticketmasterVenueId}`);

    // 2. Process and Save Shows (Iterative Approach)
    let savedCount = 0;
    let failedCount = 0;
    const processedShowIds = new Set<string>(); // Keep track of processed shows

    const showProcessingPromises = fetchedShows.map(async (show) => {
       if (!show || !show.id || processedShowIds.has(show.id)) {
        return; // Skip invalid or duplicate shows from the fetch
      }
      processedShowIds.add(show.id);

      try {
        console.log(`[sync-venue] Processing show: ${show.name} (ID: ${show.id})`);
        // Pass the show data fetched from Ticketmaster to saveShowToDatabase.
        // It handles saving dependencies (artist, venue) and the show itself,
        // plus triggers setlist creation.
        // Pass triggeredBySync = true to prevent this save from re-triggering a sync.
        const savedShow = await saveShowToDatabase(show, { triggeredBySync: true });
        if (savedShow) {
          savedCount++;
          console.log(`[sync-venue] Successfully processed show ${show.name} (ID: ${show.id})`);
        } else {
          failedCount++;
           console.warn(`[sync-venue] saveShowToDatabase returned null/undefined for show ${show.name} (ID: ${show.id})`);
        }
      } catch (error: unknown) {
        failedCount++;
        const errMsg = error instanceof Error ? error.message : String(error);
        console.error(`[sync-venue] Failed to process show ${show.name} (ID: ${show.id}):`, errMsg);
        // Continue processing other shows
      }
    });

    // Wait for all show processing attempts to complete
    await Promise.allSettled(showProcessingPromises);
    console.log(`[sync-venue] Sync finished for venue ${ticketmasterVenueId}. Saved/Updated: ${savedCount}, Failed: ${failedCount}`);

    // 3. Return Success Response
    return new Response(JSON.stringify({
      success: true,
      message: `Venue sync completed. Shows processed: ${fetchedShows.length}, Saved/Updated: ${savedCount}, Failed: ${failedCount}.`,
      savedShows: savedCount,
      failedShows: failedCount
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : 'Internal Server Error';
    console.error('[sync-venue] Unhandled error in function:', error);
    return new Response(JSON.stringify({ error: errMsg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});