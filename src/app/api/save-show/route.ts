import { adminClient } from '@/lib/db'; // Keep admin client if needed for auth checks?
import type { Show } from '@/lib/types'; // Import Show type from types file
import { SyncManager } from '@/lib/sync/manager'; // Import SyncManager
const syncManager = new SyncManager(); // Instantiate SyncManager

// Remove internal helper functions as their logic will be handled by SyncManager services
/*
async function createSetlistDirectly(showId: string, artistId: string) {
  try {
    // Check if setlist already exists
    const { data: existingSetlist, error: checkError } = await adminClient()
      .from('setlists')
      .select('id')
      .eq('show_id', showId)
      .maybeSingle();
    
    if (checkError) {
      console.error(`[createSetlistDirectly] Error checking for existing setlist: ${checkError.message}`);
      return null;
    }
    
    // If setlist already exists, return its ID
    if (existingSetlist) {
      console.log(`[createSetlistDirectly] Setlist already exists for show ${showId}`);
      return existingSetlist.id;
    }
    
    // Create new setlist
    const { data: newSetlist, error: createError } = await adminClient()
      .from('setlists')
      .insert({
        artist_id: artistId,
        show_id: showId,
        created_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (createError || !newSetlist) {
      console.error(`[createSetlistDirectly] Error creating setlist: ${createError?.message}`);
      return null;
    }
    
    console.log(`[createSetlistDirectly] Created setlist for show ${showId}. Fetching tracks for artist...`);
    
    // Fetch artist's Spotify ID to get tracks
    const { data: artist, error: artistError } = await adminClient()
      .from('artists')
      .select('id, name, spotify_id')
      .eq('id', artistId)
      .single();
    
    if (artistError || !artist) {
      console.error(`[createSetlistDirectly] Error fetching artist data: ${artistError?.message}`);
      // Continue even if we can't get the artist - we at least created the setlist
      return newSetlist.id;
    }
    
    // Get artist's top tracks and add them to the setlist
    try {
      await populateSetlistWithTracks(newSetlist.id, artist);
    } catch (tracksError) {
      console.error(`[createSetlistDirectly] Error populating setlist with tracks: ${tracksError}`);
      // Return the setlist ID anyway - we can populate tracks later
    }
    
    return newSetlist.id;
  } catch (error) {
    console.error(`[createSetlistDirectly] Error creating setlist: ${error}`);
    return null;
// Removed populateSetlistWithTracks
*/

/*
async function populateSetlistWithTracks(setlistId: string, artist: { id: string, name: string, spotify_id?: string }) {
  try {
    if (!artist.spotify_id) {
      console.log(`[populateSetlistWithTracks] No Spotify ID for artist ${artist.name}, searching...`);
      
      // Try to search Spotify for this artist
      // For now, let's just add placeholder tracks
      const songNames = [
        "Greatest Hit 1", 
        "Popular Song", 
        "Fan Favorite", 
        "Classic Track", 
        "New Single"
      ];
      
      let position = 0;
      for (const songName of songNames) {
        position++;
        
        // Create a placeholder song
        const { data: songData, error: songError } = await adminClient()
          .from('songs')
          .insert({
            name: `${songName} (by ${artist.name})`,
            artist_id: artist.id
          })
          .select()
          .single();
        
        if (songError || !songData) {
          console.error(`[populateSetlistWithTracks] Error creating song ${songName}: ${songError?.message}`);
          continue;
        }
        
        // Add to setlist_songs
        await adminClient()
          .from('setlist_songs')
          .insert({
            setlist_id: setlistId,
            song_id: songData.id,
            name: songData.name,
            position: position,
            artist_id: artist.id,
            vote_count: 0
          });
      }
      
      console.log(`[populateSetlistWithTracks] Added ${position} placeholder songs to setlist ${setlistId}`);
      return;
    }
    
    // We have a Spotify ID, so we can fetch actual tracks
    console.log(`[populateSetlistWithTracks] Fetching tracks for artist ${artist.name} (Spotify ID: ${artist.spotify_id})`);
    
    // This would normally call a Spotify API
    // For now, add placeholder tracks with the actual artist name
    const songNames = [
      "Greatest Hit", 
      "Popular Song", 
      "Fan Favorite", 
      "Classic Track", 
      "New Single"
    ];
    
    let position = 0;
    for (const songName of songNames) {
      position++;
      
      // Create a song with the artist's name
      const { data: songData, error: songError } = await adminClient()
        .from('songs')
        .insert({
          name: `${songName} (by ${artist.name})`,
          artist_id: artist.id,
          spotify_id: `placeholder-${artist.spotify_id}-${position}`
        })
        .select()
        .single();
      
      if (songError || !songData) {
        console.error(`[populateSetlistWithTracks] Error creating song ${songName}: ${songError?.message}`);
        continue;
      }
      
      // Add to setlist_songs
      await adminClient()
        .from('setlist_songs')
        .insert({
          setlist_id: setlistId,
          song_id: songData.id,
          name: songData.name,
          position: position,
          artist_id: artist.id,
          vote_count: 0
        });
    }
    
    console.log(`[populateSetlistWithTracks] Added ${position} songs to setlist ${setlistId}`);
  } catch (error) {
    console.error(`[populateSetlistWithTracks] Error populating setlist with tracks: ${error}`);
    throw error;
// Removed syncVenueShows
*/

/*
async function syncVenueShows(venueId: string, venueName: string) {
  console.log(`[syncVenueShows] Starting sync for venue ${venueName} (${venueId})`);
  try {
    // For now, just log that we would sync venue shows
    console.log(`[syncVenueShows] Would sync all shows for venue ${venueName} (${venueId})`);
    return { success: true, message: "Venue sync triggered" };
  } catch (error) {
    console.error(`[syncVenueShows] Error syncing venue shows: ${error}`);
    return { success: false, error: "Failed to sync venue shows" };
// Removed saveShowWithAdmin
*/

/*
async function saveShowWithAdmin(show: Show, triggeredBySync: boolean = false) {
  try {
    console.log(`[API/save-show] Saving show ${show.id} with admin client`);
    
    // Extend Show type to include the artist and venue objects that may be attached
    type ExtendedShow = Show & {
      artist?: {
        id: string;
        name: string;
        image_url?: string;
      };
      venue?: {
        id: string;
        name: string;
        city?: string;
        state?: string;
        country?: string;
      };
      ticket_url?: string;
      external_url?: string;
    };
    
    // Cast to extended type
    const extendedShow = show as ExtendedShow;

    // --- Save Artist (using admin client) ---
    let artistId = extendedShow.artist_id;
    let artistNameForTracks = extendedShow.artist?.name || 'Artist'; // Need name for track fetching logs
    if (extendedShow.artist && typeof extendedShow.artist === 'object') {
        // Replicate the upsert logic directly with adminClient
        console.log(`[API/save-show] Attempting to upsert artist: ID=${extendedShow.artist.id}, Name=${extendedShow.artist.name}`); // Log before
        const artistPayload = {
            id: extendedShow.artist.id,
            name: extendedShow.artist.name,
            image_url: extendedShow.artist.image_url,
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
    let venueId = extendedShow.venue_id;
    let venueName = extendedShow.venue?.name;
    if (extendedShow.venue && typeof extendedShow.venue === 'object') {
        // Replicate upsert logic directly with adminClient
        const { data: savedVenue, error: venueError } = await adminClient()
            .from('venues')
            .upsert({
                id: extendedShow.venue.id,
                name: extendedShow.venue.name,
                city: extendedShow.venue.city,
                state: extendedShow.venue.state,
                country: extendedShow.venue.country,
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
      console.error(`[API/save-show] Cannot save show ${extendedShow.name}, missing artistId (${artistId}) or venueId (${venueId})`);
      return null;
    }

    // --- Upsert Show (using admin client) ---
    const { data: savedShowData, error: showError } = await adminClient()
      .from('shows')
      .upsert({
        id: extendedShow.id,
        name: extendedShow.name,
        date: extendedShow.date,
        ticket_url: extendedShow.ticket_url,
        image_url: extendedShow.image_url,
        artist_id: artistId,
        venue_id: venueId,
        updated_at: new Date().toISOString()
      })
      .select() // Select all columns after upsert
      .single();

    if (showError) {
      console.error("[API/save-show] Error saving show:", showError);
      return null;
    }
    console.log(`[API/save-show] Successfully saved show ${extendedShow.name}`);

    // --- Trigger Background Sync ---
    if (!triggeredBySync && venueId && venueName) {
      console.log(`[API/save-show] Triggering background sync for venue: ${venueName} (${venueId})`);
      // Call syncVenueShows without awaiting it
      syncVenueShows(venueId, venueName).catch(syncError => {
        console.error(`[API/save-show] Background venue sync failed for ${venueName} (${venueId}):`, syncError);
      });
    }

    // --- Create Setlist (using admin client via imported function) ---
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
*/


export async function POST(request: Request) {
  try {
    // TODO: Add authentication/authorization checks if needed
    // const { data: { user } } = await adminClient().auth.getUser();
    // if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    // Add admin check if required

    const showPayload = await request.json(); // Assume payload contains necessary show, artist, venue IDs/data

    // Validate payload
    if (!showPayload || !showPayload.id || !showPayload.artist_id || !showPayload.venue_id) {
      return new Response(JSON.stringify({ success: false, error: 'Invalid show data provided. Required fields: id, artist_id, venue_id' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Enqueue tasks via SyncManager
    // Queue artist sync (create/update)
    await syncManager.enqueueTask({
      type: 'artist',
      id: showPayload.artist_id, // Assuming payload provides the external ID
      operation: 'create', // 'create' handles upsert via sync service
      priority: 'medium',
      // payload: showPayload.artist // Pass artist details if available in payload
    });

    // Queue venue sync (create/update)
    await syncManager.enqueueTask({
      type: 'venue',
      id: showPayload.venue_id, // Assuming payload provides the external ID
      operation: 'create',
      priority: 'medium',
      // payload: showPayload.venue // Pass venue details if available in payload
    });

    // Queue show sync (create/update) - this might depend on artist/venue sync completing
    // Or the show sync service can handle fetching/linking artist/venue
    await syncManager.enqueueTask({
      type: 'show',
      id: showPayload.id, // Assuming payload provides the external ID
      operation: 'create',
      priority: 'high', // Higher priority as it's the main entity here
      payload: showPayload // Pass the full payload for the sync service
    });

    // The sync manager will handle creating the show, artist, venue,
    // and potentially the initial setlist as part of the 'show' sync operation.

    console.log(`[API/save-show] Queued sync tasks for show ID: ${showPayload.id}`);

    // Return success response - indicating tasks are queued
    return new Response(JSON.stringify({ success: true, message: `Sync tasks queued for show ${showPayload.id}` }), {
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
