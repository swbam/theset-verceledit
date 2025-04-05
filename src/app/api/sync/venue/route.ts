// Use standard Request/Response for broader compatibility (Vite/Edge/Node)
// Note: Specific hosting might require adapters (e.g., Vercel/Netlify functions)
import { adminClient } from '@/lib/db'; // Use admin client for elevated privileges
import { saveShowToDatabase, saveArtistToDatabase, saveVenueToDatabase } from '@/lib/api/database-utils';
import { fetchVenueEvents } from '@/lib/ticketmaster'; // Assuming this function exists or will be created
import { Show, Artist, Venue } from '@/lib/types';
import { z } from 'zod';

// Input schema validation
const syncVenueSchema = z.object({
  venueId: z.string().min(1, "Venue ID is required"),
  // Optional: Add ticketmasterVenueId if needed for fetching
  ticketmasterVenueId: z.string().optional(),
});

export async function POST(request: Request): Promise<Response> { // Use standard Request, return Promise<Response>
  console.log('[API /sync/venue] Received sync request');
  let venueId: string;
  let ticketmasterVenueId: string | undefined;

  try {
    const body = await request.json();
    const parsed = syncVenueSchema.safeParse(body);

    if (!parsed.success) {
      console.error('[API /sync/venue] Invalid request body:', parsed.error.errors);
      return new Response(JSON.stringify({ success: false, error: 'Invalid request body', details: parsed.error.flatten() }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    venueId = parsed.data.venueId;
    ticketmasterVenueId = parsed.data.ticketmasterVenueId; // Use this if needed for fetchVenueEvents

    console.log(`[API /sync/venue] Starting sync for venue ID: ${venueId} (Ticketmaster ID: ${ticketmasterVenueId || 'N/A'})`);

    // 1. Fetch Venue Details (Optional but good practice)
    // Ensure the venue we are syncing actually exists in our DB
    const { data: venueDetails, error: venueError } = await adminClient()
      .from('venues')
      .select('id, name, ticketmaster_id') // Select ticketmaster_id if needed
      .eq('id', venueId)
      .maybeSingle();

    if (venueError) {
      console.error(`[API /sync/venue] Error fetching venue details for ${venueId}:`, venueError);
      // Decide if this is fatal or not - maybe continue if TM ID was provided?
      return new Response(JSON.stringify({ success: false, error: 'Failed to fetch venue details', details: venueError.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!venueDetails) {
      console.warn(`[API /sync/venue] Venue ${venueId} not found in DB. Sync cannot proceed unless Ticketmaster ID is provided and valid.`);
      // If ticketmasterVenueId is not provided, we must stop.
      if (!ticketmasterVenueId) {
         return new Response(JSON.stringify({ success: false, error: `Venue ${venueId} not found and no Ticketmaster ID provided.` }), {
           status: 404,
           headers: { 'Content-Type': 'application/json' }
         });
      }
      // If TM ID is provided, we might proceed, assuming fetchVenueEvents uses it.
    }

    // Use the most reliable Ticketmaster ID available
    const effectiveTicketmasterVenueId = ticketmasterVenueId || venueDetails?.ticketmaster_id;

    if (!effectiveTicketmasterVenueId) {
        console.error(`[API /sync/venue] Cannot sync venue ${venueId}: Missing Ticketmaster Venue ID.`);
        return new Response(JSON.stringify({ success: false, error: `Missing Ticketmaster ID for venue ${venueId}` }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
    }

    // 2. Fetch Shows from External API (e.g., Ticketmaster)
    console.log(`[API /sync/venue] Fetching events for Ticketmaster venue ID: ${effectiveTicketmasterVenueId}`);
    const fetchedShows: Show[] | null = await fetchVenueEvents(effectiveTicketmasterVenueId); // Use the TM ID

    if (!fetchedShows) {
      console.log(`[API /sync/venue] No shows found or error fetching for venue ${effectiveTicketmasterVenueId}. Sync completed.`);
      // Return success even if no shows found, as the sync operation itself didn't fail
      return new Response(JSON.stringify({ success: true, message: 'No new shows found for venue.', savedShows: 0, failedShows: 0 }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
     if (fetchedShows.length === 0) {
      console.log(`[API /sync/venue] Zero shows returned for venue ${effectiveTicketmasterVenueId}. Sync completed.`);
      return new Response(JSON.stringify({ success: true, message: 'No upcoming shows listed for venue.', savedShows: 0, failedShows: 0 }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    console.log(`[API /sync/venue] Fetched ${fetchedShows.length} potential shows for venue ${effectiveTicketmasterVenueId}`);

    // 3. Process and Save Shows (Iterative Approach)
    let savedCount = 0;
    let failedCount = 0;
    const processedShowIds = new Set<string>(); // Keep track of processed shows

    for (const show of fetchedShows) {
      if (!show || !show.id || processedShowIds.has(show.id)) {
        continue; // Skip invalid or duplicate shows from the fetch
      }
      processedShowIds.add(show.id);

      try {
        console.log(`[API /sync/venue] Processing show: ${show.name} (ID: ${show.id})`);

        // Ensure artist exists (saveArtistToDatabase handles upsert)
        let artistId = show.artist_id;
        if (show.artist && typeof show.artist === 'object') {
            const savedArtist = await saveArtistToDatabase(show.artist as Artist); // Type assertion
            artistId = savedArtist?.id; // Use the ID from the saved record
            if (!artistId) {
                console.warn(`[API /sync/venue] Failed to save artist ${show.artist.name} for show ${show.name}. Skipping show.`);
                failedCount++;
                continue;
            }
            show.artist_id = artistId; // Update show object with correct ID
        } else if (!artistId) {
             console.warn(`[API /sync/venue] Missing artist information for show ${show.name}. Skipping show.`);
             failedCount++;
             continue;
        }

        // Ensure venue exists (saveVenueToDatabase handles upsert)
        // We already fetched/validated the primary venue, but shows might list slightly different venue data?
        // It's safer to ensure the specific venue object linked to the show is saved.
        let currentVenueId = show.venue_id || venueId; // Use venueId from request as fallback
         if (show.venue && typeof show.venue === 'object') {
            const savedVenue = await saveVenueToDatabase(show.venue as Venue); // Type assertion
            currentVenueId = savedVenue?.id; // Use the ID from the saved record
             if (!currentVenueId) {
                console.warn(`[API /sync/venue] Failed to save venue ${show.venue.name} for show ${show.name}. Skipping show.`);
                failedCount++;
                continue;
            }
            show.venue_id = currentVenueId; // Update show object
         } else if (!currentVenueId) {
             console.warn(`[API /sync/venue] Missing venue information for show ${show.name}. Skipping show.`);
             failedCount++;
             continue;
         }


        // Prepare show data for saving (ensure IDs are set)
        const showToSave: Show = {
            ...show,
            artist_id: artistId,
            venue_id: currentVenueId,
        };

        // Save the show (this will also trigger setlist/song creation)
        // Pass triggeredBySync = true to potentially optimize downstream? (Requires modification in saveShowToDatabase)
        // For now, call it normally. The checks inside saveShowToDatabase will prevent redundant updates if data is fresh.
        await saveShowToDatabase(showToSave /*, triggeredBySync: true */);
        savedCount++;
        console.log(`[API /sync/venue] Successfully processed show ${show.name}`);

      } catch (error: unknown) { // Use unknown
        failedCount++;
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`[API /sync/venue] Failed to process show ${show.name} (ID: ${show.id}):`, errorMessage);
        // Continue processing other shows
      }
    }

    console.log(`[API /sync/venue] Sync finished for venue ${venueId}. Saved/Updated: ${savedCount}, Failed: ${failedCount}`);
    return new Response(JSON.stringify({
      success: true,
      message: `Venue sync completed. Shows processed: ${savedCount + failedCount}, Saved/Updated: ${savedCount}, Failed: ${failedCount}.`,
      savedShows: savedCount,
      failedShows: failedCount
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: unknown) { // Use unknown
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[API /sync/venue] Unexpected error during sync:', errorMessage);
    return new Response(JSON.stringify({ success: false, error: 'Server error during venue sync', details: errorMessage }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}