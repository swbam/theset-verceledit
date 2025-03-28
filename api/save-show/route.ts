import { adminClient } from '@/lib/db'; // Use the server-side admin client - @ alias should still work
import { saveArtistToDatabase, saveVenueToDatabase } from '@/lib/api/database-utils'; // Import necessary functions
import { fetchAndStoreArtistTracks } from '@/lib/api/database'; // Import track fetching
import { createSetlistDirectly } from '@/lib/api/database-utils'; // Import setlist creation
import { syncVenueShows } from '@/app/api/sync/venue'; // Import venue sync - Path needs checking relative to new location
import type { Show } from '@/lib/api/shows'; // Import the Show type - @ alias should still work

// Define a wrapper or modified save function that uses the admin client internally
async function saveShowWithAdmin(show: Show, triggeredBySync: boolean = false) {
  // This function replicates the logic of saveShowToDatabase but ensures adminClient is used for writes.
  try {
    if (!show || !show.id) {
      console.error("[API/save-show] Invalid show object:", show);
      return null;
    }
    console.log(`[API/save-show] Processing show: ${show.name} (ID: ${show.id})`);

    // Check if show exists (using admin client for consistency)
    const { data: existingShow, error: checkError } = await adminClient()
      .from('shows')
      .select('id, updated_at, artist_id, venue_id')
      .eq('id', show.id)
      .maybeSingle();

    if (checkError) {
      console.error("[API/save-show] Error checking show:", checkError);
      return null; // Fail if check fails
    }

    if (existingShow) {
      const lastUpdated = new Date(existingShow.updated_at);
      const now = new Date();
      const hoursSinceUpdate = (now.getTime() - lastUpdated.getTime()) / (1000 * 60 * 60);
      if (hoursSinceUpdate < 24) {
        console.log(`[API/save-show] Show ${show.name} updated ${hoursSinceUpdate.toFixed(1)} hours ago, skipping.`);
        return existingShow; // Return existing data if recently updated
      }
    }

    // --- Save Artist (using admin client) ---
    let artistId = show.artist_id;
    let artistNameForTracks = show.artist?.name || 'Artist'; // Need name for track fetching logs
    if (show.artist && typeof show.artist === 'object') {
        // Replicate the upsert logic directly with adminClient
        console.log(`[API/save-show] Attempting to upsert artist: ID=${show.artist.id}, Name=${show.artist.name}`); // Log before
        const artistPayload = {
            id: show.artist.id,
            name: show.artist.name,
            image_url: show.artist.image,
            updated_at: new Date().toISOString()
        };
        console.log(`[API/save-show] Artist Upsert Payload:`, artistPayload); // Log payload

        const { data: savedArtist, error: artistError } = await adminClient()
            .from('artists')
            .upsert(artistPayload) // Use payload variable
            .select('id, spotify_id, name') // Select necessary fields
            .single();
        if (artistError) {
            console.error("[API/save-show] Error saving artist:", artistError);
            return null; // Fail if artist can't be saved
        }
        console.log(`[API/save-show] Artist upsert successful. Result:`, savedArtist); // Log success
        artistId = savedArtist.id;
        artistNameForTracks = savedArtist.name; // Update name from saved data

        // Track fetching will be handled by saveArtistToDatabase called during background sync
    } else {
        console.log(`[API/save-show] No valid show.artist object found for show ID: ${show.id}`); // Log if skipped
    }

    // --- Save Venue (using admin client) ---
    let venueId = show.venue_id;
    let venueName = show.venue?.name;
    if (show.venue && typeof show.venue === 'object') {
        // Replicate upsert logic directly with adminClient
        const { data: savedVenue, error: venueError } = await adminClient()
            .from('venues')
            .upsert({
                id: show.venue.id,
                name: show.venue.name,
                city: show.venue.city,
                state: show.venue.state,
                country: show.venue.country,
                // address: show.venue.address, // Not available on Show.venue type
                // postal_code: show.venue.postal_code, // Not available on Show.venue type
                // image_url: show.venue.image_url, // Not available on Show.venue type
                updated_at: new Date().toISOString()
            })
            .select('id, name') // Select necessary fields
            .single();
        if (venueError) {
            console.error("[API/save-show] Error saving venue:", venueError);
            return null; // Fail if venue can't be saved
        }
        venueId = savedVenue.id;
        venueName = savedVenue.name; // Update name from saved data
    }

    if (!artistId || !venueId) {
      console.error(`[API/save-show] Cannot save show ${show.name}, missing artistId (${artistId}) or venueId (${venueId})`);
      return null;
    }

    // --- Upsert Show (using admin client) ---
    const { data: savedShowData, error: showError } = await adminClient()
      .from('shows')
      .upsert({
        id: show.id,
        name: show.name,
        date: show.date,
        ticket_url: show.ticket_url,
        image_url: show.image_url,
        artist_id: artistId,
        venue_id: venueId,
        // popularity: show.popularity || 0, // Not available on Show type
        updated_at: new Date().toISOString()
      })
      .select() // Select all columns after upsert
      .single();

    if (showError) {
      console.error("[API/save-show] Error saving show:", showError);
      return null;
    }
    console.log(`[API/save-show] Successfully saved show ${show.name}`);

    // --- Trigger Background Sync ---
    if (!triggeredBySync && venueId && venueName) {
      console.log(`[API/save-show] Triggering background sync for venue: ${venueName} (${venueId})`);
      // Call syncVenueShows without awaiting it
      // Assuming syncVenueShows is correctly imported
      syncVenueShows(venueId, venueName).catch(syncError => {
        console.error(`[API/save-show] Background venue sync failed for ${venueName} (${venueId}):`, syncError);
      });
    }

    // --- Create Setlist (using admin client via imported function) ---
    // Assuming createSetlistDirectly uses adminClient internally now (needs verification if we didn't revert that part)
    const setlistId = await createSetlistDirectly(savedShowData.id, artistId);
    if (setlistId) {
      console.log(`[API/save-show] Created setlist for show ${savedShowData.id}: ${setlistId}`);
      // Add setlist_id to the returned show data
      return { ...savedShowData, setlist_id: setlistId };
    }

    return savedShowData; // Return the saved show object

  } catch (error) {
    console.error("[API/save-show] Unexpected error in saveShowWithAdmin:", error);
    return null;
  }
}


export async function POST(request: Request) {
  try {
    const show = await request.json() as Show;

    if (!show || !show.id) {
      return new Response(JSON.stringify({ success: false, error: 'Invalid show data provided' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Use the wrapper function that utilizes adminClient
    const savedShow = await saveShowWithAdmin(show);

    if (!savedShow) {
      console.error(`[API/save-show] Failed to save show ID: ${show.id}`);
      return new Response(JSON.stringify({ success: false, error: 'Failed to save show data' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Return success response
    return new Response(JSON.stringify({ success: true, showId: savedShow.id }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[API/save-show] Error processing request:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ success: false, error: 'Internal server error', details: errorMessage }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}