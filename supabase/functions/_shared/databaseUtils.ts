// Import shared Supabase client and types
import { supabaseAdmin } from './supabaseClient.ts';
import type { Artist, Venue, Show, SetlistSong, Song, Setlist } from './types.ts'; // Use shared types
// Import song utilities from the shared location
import { fetchAndStoreArtistTracks, saveSongToDatabase } from './songDbUtils.ts';

// NOTE: The automatic background sync trigger using fetch('/api/sync/venue', ...)
// needs to be replaced with supabase.functions.invoke('sync-venue', ...) later.
// For now, it's commented out as it won't work inside an Edge Function directly.

/**
 * Save an artist to the database using Ticketmaster ID or Spotify ID for conflicts.
 * Fetches existing record first to avoid unnecessary updates.
 */
export async function saveArtistToDatabase(artistInput: Partial<Artist>): Promise<Artist | null> {
  try {
    // Ensure we have an identifier (TM ID or Spotify ID) and name
    if (!artistInput.name || (!artistInput.ticketmaster_id && !artistInput.spotify_id)) {
      console.error("[EF saveArtist] Invalid input: Missing name or external identifier (Ticketmaster/Spotify ID)", artistInput);
      return null;
    }
    console.log(`[EF saveArtist] Processing artist: ${artistInput?.name} (TM ID: ${artistInput.ticketmaster_id}, Spotify ID: ${artistInput.spotify_id})`);

    // 1. Check if artist already exists by external IDs
    let existingArtist: Artist | null = null;
    try {
      const query = supabaseAdmin
        .from('artists')
        .select('*'); // Select all columns

      // Build OR condition based on available IDs
      const orConditions: string[] = [];
      if (artistInput.ticketmaster_id) orConditions.push(`ticketmaster_id.eq.${artistInput.ticketmaster_id}`);
      if (artistInput.spotify_id) orConditions.push(`spotify_id.eq.${artistInput.spotify_id}`);
      query.or(orConditions.join(','));

      const { data: existingData, error: checkError } = await query.maybeSingle();

      if (checkError) {
        console.error(`[EF saveArtist] Error checking artist ${artistInput.name}:`, checkError);
        throw new Error(`Failed to check artist ${artistInput.name}. Code: ${checkError.code}, Message: ${checkError.message}`);
      }

      if (existingData) {
        existingArtist = existingData as Artist;
        console.log(`[EF saveArtist] Found existing artist: ID ${existingArtist.id}`);

        // Optional: Check updated_at to potentially skip update
        const lastUpdated = existingArtist.updated_at ? new Date(existingArtist.updated_at) : null;
        if (lastUpdated) {
        const now = new Date();
        const daysSinceUpdate = (now.getTime() - lastUpdated.getTime()) / (1000 * 60 * 60 * 24);
          if (daysSinceUpdate < 7) { // Configurable threshold (e.g., 7 days)
            console.log(`[EF saveArtist] Artist ${artistInput.name} was updated ${daysSinceUpdate.toFixed(1)} days ago, skipping redundant update.`);
            // Trigger background track fetch if needed, even if skipping main update
            if (existingArtist.id && existingArtist.spotify_id) {
              fetchAndStoreArtistTracks(existingArtist.id, existingArtist.spotify_id, existingArtist.name)
                .catch(err => console.error(`[EF saveArtist] Background track fetch error (skipped update):`, err));
            }
            return existingArtist; // Return the existing record
          }
          console.log(`[EF saveArtist] Artist ${artistInput.name} needs update (last updated ${daysSinceUpdate.toFixed(1)} days ago)`);
        }
      } else {
        console.log(`[EF saveArtist] Artist ${artistInput.name} is new.`);
      }
    } catch (checkError) {
      console.error("[EF saveArtist] Unexpected error during artist existence check:", checkError);
      throw new Error(`Unexpected error checking artist ${artistInput.name}: ${checkError instanceof Error ? checkError.message : String(checkError)}`);
    }

    // 2. Prepare data for upsert
    // Merge input data with existing data (if found) to preserve fields
    const artistDataForUpsert: Partial<Artist> = {
      ...(existingArtist || {}), // Start with existing data or empty object
      ...artistInput, // Overwrite with new input data
      ticketmaster_id: artistInput.ticketmaster_id || existingArtist?.ticketmaster_id,
      spotify_id: artistInput.spotify_id || existingArtist?.spotify_id,
      setlist_fm_id: artistInput.setlist_fm_id || existingArtist?.setlist_fm_id,
      name: artistInput.name, // Always update name from input
      image_url: artistInput.image_url || existingArtist?.image_url,
      url: artistInput.url || existingArtist?.url,
      popularity: artistInput.popularity ?? existingArtist?.popularity,
      followers: artistInput.followers ?? existingArtist?.followers,
      genres: artistInput.genres || existingArtist?.genres || [],
      updated_at: new Date().toISOString(),
    };
    // Remove the UUID 'id' field if it came from existingArtist, as upsert uses conflict target
    delete artistDataForUpsert.id;
    // Ensure primary identifier is present for conflict resolution
    const conflictTarget = artistInput.ticketmaster_id ? 'ticketmaster_id' : 'spotify_id';

    try {
      console.log(`[EF saveArtist] Attempting upsert for artist: ${artistDataForUpsert.name} on conflict: ${conflictTarget}`);
      const { data: upsertedData, error: upsertError } = await supabaseAdmin
        .from('artists')
        .upsert(artistDataForUpsert, {
          onConflict: conflictTarget,
          ignoreDuplicates: false // Explicitly update on conflict
         })
        .select()
        .single();

      if (upsertError) {
        console.error(`[EF saveArtist] FAILED upsert for artist ${artistInput.name}:`, upsertError);
        // Attempt to fetch again in case of race condition or other conflict issues
        if (upsertError.code === '23505') { // Unique violation
          console.warn(`[EF saveArtist] Upsert conflict, attempting to fetch existing artist again...`);
          const { data: conflictedArtist, error: fetchError } = await supabaseAdmin
            .from('artists')
            .select('*')
            .or(`ticketmaster_id.eq.${artistInput.ticketmaster_id || ''},spotify_id.eq.${artistInput.spotify_id || ''}`)
            .maybeSingle();
          if (fetchError) {
            console.error(`[EF saveArtist] Error fetching conflicted artist:`, fetchError);
          }
          if (conflictedArtist) {
             console.log(`[EF saveArtist] Found conflicted artist with ID: ${conflictedArtist.id}. Returning it.`);
             return conflictedArtist as Artist;
          }
        }
        throw new Error(`Failed to save artist ${artistInput.name}. Code: ${upsertError.code}, Message: ${upsertError.message}`);
      }

      const savedDbArtist = upsertedData as Artist;
      console.log(`[EF saveArtist] Successfully saved/updated artist ${savedDbArtist.name} (DB ID: ${savedDbArtist.id})`);

      // Trigger background track fetch after successful save/update
      if (savedDbArtist?.id && savedDbArtist?.spotify_id) {
        fetchAndStoreArtistTracks(savedDbArtist.id, savedDbArtist.spotify_id, savedDbArtist.name)
          .catch(err => console.error(`[EF saveArtist] Error fetching tracks for artist ${savedDbArtist.name}:`, err));
      }

      return savedDbArtist; // Return the full saved DB record
    } catch (saveError) {
      console.error("[EF saveArtist] Error during upsert attempt:", saveError);
      throw saveError;
    }
  } catch (error) {
    console.error("[EF saveArtist] Unexpected top-level error:", error);
    throw new Error(`Unexpected error processing artist ${artistInput?.name}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Save a venue to the database using Ticketmaster ID for conflicts.
 */
export async function saveVenueToDatabase(venueInput: Partial<Venue>): Promise<Venue | null> {
  try {
    if (!venueInput || !venueInput.ticketmaster_id || !venueInput.name) {
      console.error("[EF saveVenue] Invalid input: Missing name or Ticketmaster ID", venueInput);
      return null;
    }
    console.log(`[EF saveVenue] Processing venue: ${venueInput.name} (TM ID: ${venueInput.ticketmaster_id})`);

    // 1. Check if venue exists by Ticketmaster ID
    let existingVenue: Venue | null = null;
    try {
      const { data: existingData, error: checkError } = await supabaseAdmin
        .from('venues')
        .select('*') // Select all columns
        .eq('ticketmaster_id', venueInput.ticketmaster_id)
        .maybeSingle();

      if (checkError) {
        console.error(`[EF saveVenue] Error checking venue ${venueInput.name}:`, checkError);
        throw new Error(`Failed to check venue ${venueInput.name}. Code: ${checkError.code}, Message: ${checkError.message}`);
      }

      if (existingData) {
        existingVenue = existingData as Venue;
        console.log(`[EF saveVenue] Found existing venue: ID ${existingVenue.id}`);
        // Optional: Check updated_at (e.g., < 30 days)
        const lastUpdated = existingVenue.updated_at ? new Date(existingVenue.updated_at) : null;
        if (lastUpdated) {
        const now = new Date();
        const daysSinceUpdate = (now.getTime() - lastUpdated.getTime()) / (1000 * 60 * 60 * 24);
          if (daysSinceUpdate < 30) { // Configurable threshold
            console.log(`[EF saveVenue] Venue ${venueInput.name} updated ${daysSinceUpdate.toFixed(1)} days ago, skipping redundant update.`);
            return existingVenue;
          }
           console.log(`[EF saveVenue] Venue ${venueInput.name} needs update (last updated ${daysSinceUpdate.toFixed(1)} days ago)`);
        }
      } else {
        console.log(`[EF saveVenue] Venue ${venueInput.name} is new.`);
      }
    } catch (checkError) {
      console.error("[EF saveVenue] Unexpected error during venue existence check:", checkError);
      throw new Error(`Unexpected error checking venue ${venueInput.name}: ${checkError instanceof Error ? checkError.message : String(checkError)}`);
    }

    // 2. Prepare data for upsert
    const venueDataForUpsert: Partial<Venue> = {
      ...(existingVenue || {}),
      ...venueInput,
      ticketmaster_id: venueInput.ticketmaster_id, // Ensure TM ID is present
      name: venueInput.name,
      city: venueInput.city || existingVenue?.city,
      state: venueInput.state || existingVenue?.state,
      country: venueInput.country || existingVenue?.country,
      address: venueInput.address || existingVenue?.address,
      postal_code: venueInput.postal_code || existingVenue?.postal_code,
      latitude: venueInput.latitude || existingVenue?.latitude,
      longitude: venueInput.longitude || existingVenue?.longitude,
      image_url: venueInput.image_url || existingVenue?.image_url,
      url: venueInput.url || existingVenue?.url,
      updated_at: new Date().toISOString()
    };
    delete venueDataForUpsert.id; // Remove UUID id before upsert

    try {
      console.log(`[EF saveVenue] Attempting upsert for venue: ${venueDataForUpsert.name} on conflict: ticketmaster_id`);
      const { data: upsertedData, error: upsertError } = await supabaseAdmin
        .from('venues')
        .upsert(venueDataForUpsert, { 
            onConflict: 'ticketmaster_id',
            ignoreDuplicates: false // Update on conflict
        })
        .select()
        .single();

      if (upsertError) {
        console.error(`[EF saveVenue] FAILED upsert for venue ${venueInput.name}:`, upsertError);
        // Attempt to fetch again on conflict
        if (upsertError.code === '23505') { 
          console.warn(`[EF saveVenue] Upsert conflict, attempting to fetch existing venue again...`);
          const { data: conflictedVenue, error: fetchError } = await supabaseAdmin
            .from('venues')
            .select('*')
            .eq('ticketmaster_id', venueInput.ticketmaster_id)
            .maybeSingle();
          if (fetchError) console.error(`[EF saveVenue] Error fetching conflicted venue:`, fetchError);
          if (conflictedVenue) {
            console.log(`[EF saveVenue] Found conflicted venue with ID: ${conflictedVenue.id}. Returning it.`);
            return conflictedVenue as Venue;
          }
        }
        throw new Error(`Failed to save venue ${venueInput.name}. Code: ${upsertError.code}, Message: ${upsertError.message}`);
      }

      const savedDbVenue = upsertedData as Venue;
      console.log(`[EF saveVenue] Successfully saved/updated venue ${savedDbVenue.name} (DB ID: ${savedDbVenue.id})`);
      return savedDbVenue; // Return the full saved DB record
    } catch (saveError) {
      console.error("[EF saveVenue] Error during upsert attempt:", saveError);
      throw saveError;
    }
  } catch (error) {
    console.error("[EF saveVenue] Unexpected top-level error:", error);
    throw new Error(`Unexpected error processing venue ${venueInput?.name}: ${error instanceof Error ? error.message : String(error)}`);
  }
}


/**
 * Save a show to the database using Ticketmaster ID for conflicts.
 * Ensures artist and venue exist first, using their DB UUIDs for foreign keys.
 * Also triggers setlist creation.
 */
// Simplified signature to accept just Partial<Show>
export async function saveShowToDatabase(showInput: Partial<Show>): Promise<Show | null> {
  try {
    if (!showInput || !showInput.ticketmaster_id || !showInput.name) {
      console.error("[EF saveShow] Invalid input: Missing name or Ticketmaster ID", showInput);
      return null;
    }
    console.log(`[EF saveShow] Processing show: ${showInput.name} (TM ID: ${showInput.ticketmaster_id})`);

    // 1. Ensure artist and venue exist in DB first, get their UUIDs
    let dbArtistId: string | undefined;
    let dbVenueId: string | undefined;

    // Resolve Artist
    if (showInput.artist && typeof showInput.artist === 'object') {
      console.log(`[EF saveShow] Show included artist object: ${showInput.artist.name}`);
      const savedArtist = await saveArtistToDatabase(showInput.artist);
      dbArtistId = savedArtist?.id;
    } else if (showInput.artist_id) {
      // If only artist_id (assumed to be TM ID unless it's already a UUID) is provided
      // Try to find the artist by TM ID or potential UUID
      console.log(`[EF saveShow] Show provided artist_id: ${showInput.artist_id}. Checking if it's a known TM ID or UUID...`);
      const { data: foundArtist, error: findArtistError } = await supabaseAdmin
        .from('artists')
        .select('id')
        .or(`ticketmaster_id.eq.${showInput.artist_id},id.eq.${showInput.artist_id}`) // Check both TM ID and UUID
        .maybeSingle();
      if (findArtistError) console.error(`[EF saveShow] Error checking artist_id ${showInput.artist_id}:`, findArtistError);
      if (foundArtist) {
        dbArtistId = foundArtist.id;
        console.log(`[EF saveShow] Found existing artist by ID ${showInput.artist_id}, using DB ID: ${dbArtistId}`);
      } else {
        console.warn(`[EF saveShow] Artist with TM ID or UUID ${showInput.artist_id} not found. Show might not be linked.`);
        // Optionally, attempt to create a minimal artist if TM ID provided?
        // const minimalArtist: Partial<Artist> = { ticketmaster_id: showInput.artist_id, name: "Unknown Artist (from Show)" };
        // const savedArtist = await saveArtistToDatabase(minimalArtist);
        // dbArtistId = savedArtist?.id;
      }
    }
    if (!dbArtistId) {
      console.warn(`[EF saveShow] Could not determine artist UUID for show ${showInput.name}. Proceeding without artist link.`);
      // Decide if this is acceptable or should throw an error
      // throw new Error(`Failed to resolve artist for show ${showInput.name}`);
    }

    // Resolve Venue
    if (showInput.venue && typeof showInput.venue === 'object') {
      console.log(`[EF saveShow] Show included venue object: ${showInput.venue.name}`);
      const savedVenue = await saveVenueToDatabase(showInput.venue);
      dbVenueId = savedVenue?.id;
    } else if (showInput.venue_id) {
      // If only venue_id (assumed TM ID unless UUID) is provided
      console.log(`[EF saveShow] Show provided venue_id: ${showInput.venue_id}. Checking if it's a known TM ID or UUID...`);
      const { data: foundVenue, error: findVenueError } = await supabaseAdmin
        .from('venues')
        .select('id')
        .or(`ticketmaster_id.eq.${showInput.venue_id},id.eq.${showInput.venue_id}`) // Check both TM ID and UUID
        .maybeSingle();
      if (findVenueError) console.error(`[EF saveShow] Error checking venue_id ${showInput.venue_id}:`, findVenueError);
      if (foundVenue) {
        dbVenueId = foundVenue.id;
        console.log(`[EF saveShow] Found existing venue by ID ${showInput.venue_id}, using DB ID: ${dbVenueId}`);
      } else {
        console.warn(`[EF saveShow] Venue with TM ID or UUID ${showInput.venue_id} not found. Show might not be linked.`);
        // Optionally, attempt to create minimal venue?
      }
    }
    if (!dbVenueId) {
      console.warn(`[EF saveShow] Could not determine venue UUID for show ${showInput.name}. Proceeding without venue link.`);
       // Decide if this is acceptable or should throw an error
       // throw new Error(`Failed to resolve venue for show ${showInput.name}`);
    }

    // 2. Check if show already exists by Ticketmaster ID
    let existingShow: Show | null = null;
    try {
      const { data: existingData, error: checkError } = await supabaseAdmin
        .from('shows')
        .select('*') // Select all columns
        .eq('ticketmaster_id', showInput.ticketmaster_id)
        .maybeSingle();

      if (checkError) {
        console.error(`[EF saveShow] Error checking show ${showInput.name}:`, checkError);
        throw new Error(`Failed to check show ${showInput.name}. Code: ${checkError.code}, Message: ${checkError.message}`);
      }

      if (existingData) {
        existingShow = existingData as Show;
        console.log(`[EF saveShow] Found existing show: ID ${existingShow.id}`);
        // Optional: Check updated_at (e.g., < 24 hours)
        const lastUpdated = existingShow.updated_at ? new Date(existingShow.updated_at) : null;
        if (lastUpdated) {
        const now = new Date();
        const hoursSinceUpdate = (now.getTime() - lastUpdated.getTime()) / (1000 * 60 * 60);
           if (hoursSinceUpdate < 24) { // Configurable threshold
              console.log(`[EF saveShow] Show ${showInput.name} updated ${hoursSinceUpdate.toFixed(1)} hours ago, skipping redundant update.`);
              // Consider triggering setlist creation even if show update is skipped?
              // if (existingShow.id && dbArtistId) {
              //   createSetlistDirectly(existingShow.id, dbArtistId).catch(e => console.error('Setlist creation error (skipped update):', e));
              // }
              return existingShow;
           }
           console.log(`[EF saveShow] Show ${showInput.name} needs update (last updated ${hoursSinceUpdate.toFixed(1)} hours ago)`);
        }
      } else {
        console.log(`[EF saveShow] Show ${showInput.name} is new.`);
      }
    } catch (checkError) {
      console.error("[EF saveShow] Unexpected error during show existence check:", checkError);
      throw new Error(`Unexpected error checking show ${showInput.name}: ${checkError instanceof Error ? checkError.message : String(checkError)}`);
    }

    // 3. Prepare data for upsert
    const showDataForUpsert: Partial<Show> = {
      ...(existingShow || {}),
      // ...showInput, // Be careful not to overwrite resolved artist/venue IDs
      ticketmaster_id: showInput.ticketmaster_id, // Ensure TM ID is present
      name: showInput.name,
      artist_id: dbArtistId || existingShow?.artist_id || undefined, // Use resolved DB UUID
      venue_id: dbVenueId || existingShow?.venue_id || undefined,   // Use resolved DB UUID
      date: showInput.date ? new Date(showInput.date).toISOString() : existingShow?.date || undefined,
      image_url: showInput.image_url || existingShow?.image_url || undefined,
      ticket_url: showInput.ticket_url || existingShow?.ticket_url || undefined,
      popularity: showInput.popularity ?? existingShow?.popularity ?? 0,
      updated_at: new Date().toISOString(),
    };
    delete showDataForUpsert.id; // Remove UUID id before upsert
    delete (showDataForUpsert as any).artist; // Remove nested objects
    delete (showDataForUpsert as any).venue;  // Remove nested objects

    try {
      console.log(`[EF saveShow] Attempting upsert for show: ${showDataForUpsert.name} on conflict: ticketmaster_id`);
      const { data: upsertedData, error: upsertError } = await supabaseAdmin
      .from('shows')
        .upsert(showDataForUpsert, { 
            onConflict: 'ticketmaster_id',
            ignoreDuplicates: false // Update on conflict
        })
      .select()
      .single();

      if (upsertError) {
        console.error(`[EF saveShow] FAILED upsert for show ${showInput.name}:`, upsertError);
         // Attempt to fetch again on conflict
        if (upsertError.code === '23505') { 
          console.warn(`[EF saveShow] Upsert conflict, attempting to fetch existing show again...`);
          const { data: conflictedShow, error: fetchError } = await supabaseAdmin
            .from('shows')
            .select('*')
            .eq('ticketmaster_id', showInput.ticketmaster_id)
            .maybeSingle();
          if (fetchError) console.error(`[EF saveShow] Error fetching conflicted show:`, fetchError);
          if (conflictedShow) {
            console.log(`[EF saveShow] Found conflicted show with ID: ${conflictedShow.id}. Returning it.`);
            return conflictedShow as Show;
          }
        }
        throw new Error(`Failed to save show ${showInput.name}. Code: ${upsertError.code}, Message: ${upsertError.message}`);
      }

      const savedDbShow = upsertedData as Show;
      console.log(`[EF saveShow] Successfully saved/updated show ${savedDbShow.name} (DB ID: ${savedDbShow.id})`);

      // 4. Trigger setlist creation (async, don't block show return)
      if (savedDbShow.id && dbArtistId) {
          console.log(`[EF saveShow] Triggering setlist creation for show ID: ${savedDbShow.id}, artist ID: ${dbArtistId}`);
          createSetlistDirectly(savedDbShow.id, dbArtistId)
            .then(setlistId => {
              if (setlistId) {
                console.log(`[EF saveShow] Setlist creation initiated successfully for show ${savedDbShow.name}. Setlist ID: ${setlistId}`);
           } else {
                console.warn(`[EF saveShow] Setlist creation function returned null for show ${savedDbShow.name}.`);
           }
         })
            .catch(e => console.error(`[EF saveShow] Error during async setlist creation for show ${savedDbShow.name}:`, e));
      } else {
          console.warn(`[EF saveShow] Skipping setlist creation for show ${savedDbShow.name} due to missing DB Show ID or Artist ID.`);
      }

      return savedDbShow; // Return the full saved DB record
    } catch (saveError) {
      console.error("[EF saveShow] Error during upsert attempt:", saveError);
      throw saveError;
    }
  } catch (error) {
    console.error("[EF saveShow] Unexpected top-level error:", error);
    throw new Error(`Unexpected error processing show ${showInput?.name}: ${error instanceof Error ? error.message : String(error)}`);
  }
}


/**
 * Creates a setlist record in the database if one doesn't exist for the show.
 * This should be called *after* the show is confirmed to be in the database.
 * Returns the UUID of the created or existing setlist, or null on failure.
 */
export async function createSetlistDirectly(dbShowId: string, dbArtistId: string): Promise<string | null> {
  try {
    if (!dbShowId || !dbArtistId) {
      console.error('[EF createSetlist] Invalid input: Missing dbShowId or dbArtistId.');
      return null;
    }
    console.log(`[EF createSetlist] Checking/Creating setlist for Show ID: ${dbShowId}, Artist ID: ${dbArtistId}`);

    // 1. Check if a setlist already exists for this show
    const { data: existingSetlist, error: checkError } = await supabaseAdmin
      .from('setlists')
      .select('id') // Only need the ID
      .eq('show_id', dbShowId)
      .maybeSingle();

    if (checkError) {
      console.error(`[EF createSetlist] Error checking for existing setlist (Show ID: ${dbShowId}):`, checkError);
      throw new Error(`Failed to check for existing setlist. Code: ${checkError.code}, Message: ${checkError.message}`);
    }

    if (existingSetlist) {
      console.log(`[EF createSetlist] Setlist already exists for Show ID: ${dbShowId}. Setlist ID: ${existingSetlist.id}. Triggering population.`);
      // Populate songs even if setlist exists (in case it was empty or needs update)
      populateSetlistSongs(existingSetlist.id, dbArtistId)
        .catch(e => console.error(`[EF createSetlist] Error populating existing setlist ${existingSetlist.id}:`, e));
      return existingSetlist.id;
    }

    console.log(`[EF createSetlist] No existing setlist found for Show ID: ${dbShowId}. Creating new one.`);

    // 2. Create a new setlist record
    // We might not have venue/date info here, just link to show and artist
    const setlistData: Partial<Setlist> = {
      show_id: dbShowId,
      artist_id: dbArtistId,
      // date, venue, etc., could potentially be fetched from the 'shows' table if needed
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data: newSetlist, error: createError } = await supabaseAdmin
      .from('setlists')
      .insert(setlistData)
      .select('id') // Get the ID of the newly created setlist
      .single();

    if (createError) {
      console.error(`[EF createSetlist] Error creating new setlist (Show ID: ${dbShowId}):`, createError);
      // Handle potential race condition where setlist was created between check and insert
      if (createError.code === '23503') { // Foreign key violation (less likely here)
         console.warn(`[EF createSetlist] Foreign key violation on insert. Check if show ${dbShowId} or artist ${dbArtistId} exists.`);
      } else if (createError.code === '23505') { // Unique violation (maybe on setlist_fm_id if added)
         console.warn(`[EF createSetlist] Unique constraint violation on insert. Checking again...`);
         const { data: raceSetlist, error: raceCheckError } = await supabaseAdmin
            .from('setlists')
            .select('id')
            .eq('show_id', dbShowId)
            .maybeSingle();
          if (raceCheckError) console.error('[EF createSetlist] Error re-checking after unique violation:', raceCheckError);
          if (raceSetlist) {
             console.log(`[EF createSetlist] Found setlist created via race condition: ${raceSetlist.id}. Triggering population.`);
             populateSetlistSongs(raceSetlist.id, dbArtistId).catch(e => console.error(`Error populating race condition setlist ${raceSetlist.id}:`, e));
             return raceSetlist.id;
          }
      }
      throw new Error(`Failed to create setlist. Code: ${createError.code}, Message: ${createError.message}`);
    }

    if (!newSetlist || !newSetlist.id) {
       console.error(`[EF createSetlist] Failed to create setlist or retrieve its ID for show ${dbShowId}.`);
       return null;
    }

    console.log(`[EF createSetlist] Successfully created new setlist ${newSetlist.id} for Show ID: ${dbShowId}. Triggering population.`);

    // 3. Populate the setlist with songs (async)
    populateSetlistSongs(newSetlist.id, dbArtistId)
      .catch(e => console.error(`[EF createSetlist] Error populating newly created setlist ${newSetlist.id}:`, e));

    return newSetlist.id;
  } catch (error) {
    console.error(`[EF createSetlist] Unexpected error for Show ID ${dbShowId}:`, error);
    // Don't re-throw usually, as setlist creation is often background
    return null;
  }
}

/**
 * Populates a setlist with songs based on artist's top tracks (placeholder logic).
 * Should ideally fetch actual setlist data if available.
 */
async function populateSetlistSongs(setlistId: string, dbArtistId: string): Promise<boolean> {
  try {
    console.log(`[EF populateSetlist] Populating setlist ${setlistId} for artist ${dbArtistId}`);

    // 1. Check if setlist already has songs using count
    const { count: existingSongCount, error: checkError } = await supabaseAdmin
        .from('setlist_songs')
        .select('*', { count: 'exact', head: true }) // Use '*' or 'id' for select, count is separate
        .eq('setlist_id', setlistId);

    if (checkError) {
      console.error(`[EF populateSetlist] Error checking existing songs for setlist ${setlistId}:`, checkError);
      return false; // Abort population
    }

    if (existingSongCount && existingSongCount > 0) {
       console.log(`[EF populateSetlist] Setlist ${setlistId} already has ${existingSongCount} songs. Skipping population (for now).`);
       // TODO: Implement logic to update/refresh setlist songs if needed, e.g., based on source update time
       return true; // Consider it success as songs exist
    }

    // 2. Fetch Artist's top tracks (or actual setlist source)
    // Placeholder: Get artist's Spotify ID first
     const { data: artistData, error: artistError } = await supabaseAdmin
        .from('artists')
       .select('spotify_id, name')
       .eq('id', dbArtistId)
       .single();

    if (artistError || !artistData?.spotify_id) {
      console.error(`[EF populateSetlist] Cannot find Spotify ID for artist ${dbArtistId} to fetch top tracks.`, artistError);
      return false;
    }

    console.log(`[EF populateSetlist] Fetching top tracks for artist ${artistData.name} (Spotify ID: ${artistData.spotify_id})`);
    // Note: This fetchAndStoreArtistTracks function might *also* save the songs to the main 'songs' table.
    // We might want a version that just *returns* the track info without saving.
    const songs = await fetchAndStoreArtistTracks(dbArtistId, artistData.spotify_id, artistData.name);

    if (!songs || songs.length === 0) {
      console.log(`[EF populateSetlist] No songs found for artist ${dbArtistId}. Setlist ${setlistId} will remain empty.`);
      return true; // Success, but empty
    }

     console.log(`[EF populateSetlist] Found ${songs.length} songs for artist ${dbArtistId}. Adding to setlist ${setlistId}.`);

    // 3. Add songs to the setlist_songs table
    // Ensure 'songs' is passed, not 'true' or other incorrect value
    await addSongsToSetlistInternal(setlistId, dbArtistId, songs); 

    console.log(`[EF populateSetlist] Finished populating setlist ${setlistId}.`);
    return true;
  } catch (error) {
    console.error(`[EF populateSetlist] Error populating setlist ${setlistId}:`, error);
    return false;
  }
}

/**
 * Internal helper to add songs to the setlist_songs junction table.
 * Assumes songs already exist in the main 'songs' table (or handles their creation).
 */
async function addSongsToSetlistInternal(setlistId: string, dbArtistId: string, songs: Partial<Song>[]) {
    const setlistSongsData: Omit<SetlistSong, 'id' | 'created_at' | 'updated_at'>[] = [];

    for (let i = 0; i < songs.length; i++) {
        const songInput = songs[i];
        if (!songInput.name) {
            console.warn(`[EF addSongsInternal] Skipping song at index ${i} due to missing name.`);
            continue;
        }

        // Ensure the song exists in the main 'songs' table first, get its UUID
        // Use a dedicated function that handles song saving/fetching by Spotify ID
        const savedSong = await saveSongToDatabase({
            ...songInput,
            artist_id: dbArtistId, // Ensure artist link is correct
        });

        if (!savedSong || !savedSong.id) {
            console.error(`[EF addSongsInternal] Failed to save/find song '${songInput.name}' in 'songs' table. Skipping addition to setlist ${setlistId}.`);
            continue;
        }

        setlistSongsData.push({
            setlist_id: setlistId,
            song_id: savedSong.id, // Use the UUID from the 'songs' table
            name: savedSong.name, // Use the name from the saved song
            position: i + 1,
            artist_id: dbArtistId, // Store artist_id here too for potential denormalization/querying
            vote_count: 0, // Initialize vote count
        });
    }

    if (setlistSongsData.length > 0) {
        console.log(`[EF addSongsInternal] Inserting ${setlistSongsData.length} songs into setlist_songs for setlist ${setlistId}`);
        const { error: insertError } = await supabaseAdmin
            .from('setlist_songs')
            .insert(setlistSongsData, {
               // onConflict: '(setlist_id, song_id)', // Or '(setlist_id, position)' depending on desired uniqueness
               // ignoreDuplicates: true // Decide if duplicates should be ignored or cause error
             }); // Using default insert, assuming duplicates won't occur due to prior check or are okay

        if (insertError) {
            // Common errors: unique constraint violation (23505) if onConflict isn't set right,
            // foreign key violation (23503) if setlist_id or song_id doesn't exist.
            console.error(`[EF addSongsInternal] Error inserting songs into setlist_songs for setlist ${setlistId}:`, insertError);
            // Consider retry or more specific error handling
            if (insertError.message.includes('duplicate key value violates unique constraint')) {
                 console.warn(`[EF addSongsInternal] Duplicate songs detected for setlist ${setlistId}. Some songs might not have been added.`);
            } else if (insertError.message.includes('violates foreign key constraint')) {
                console.error(`[EF addSongsInternal] Foreign key violation inserting setlist songs. Check setlist ${setlistId} and song UUIDs.`);
            }
        } else {
            console.log(`[EF addSongsInternal] Successfully inserted ${setlistSongsData.length} songs for setlist ${setlistId}`);
        }
    } else {
        console.log(`[EF addSongsInternal] No valid songs to insert for setlist ${setlistId}.`);
    }
}
// --- End Setlist/Song Linking ---

/**
 * Save a vote to the database using (song_id, user_id) composite key for conflicts.
 * Handles adding new votes or updating existing vote counts.
 * 
 * @param voteInput The vote data to save, must include setlist_song_id and user_id
 * @param options Optional settings including incrementBy to adjust existing vote counts
 * @returns The saved vote record or null on error
 */
export async function saveVoteToDatabase(
  voteInput: { 
    song_id: string, // UUID of the setlist_song
    user_id: string, // UUID of the user
    count?: number   // Optional explicit count (defaults to 1 for new votes)
  },
  options: { 
    incrementBy?: number // If provided, increments existing vote by this amount
  } = {}
): Promise<{ id: string, song_id: string, user_id: string, count: number } | null> {
  try {
    // Validate required fields
    if (!voteInput.song_id || !voteInput.user_id) {
      console.error("[EF saveVote] Invalid input: Missing song_id or user_id", voteInput);
      return null;
    }
    
    console.log(`[EF saveVote] Processing vote: Song ID: ${voteInput.song_id}, User ID: ${voteInput.user_id}`);

    // 1. Check if vote exists by composite key (song_id, user_id)
    let existingVote = null;
    try {
      const { data: existingData, error: checkError } = await supabaseAdmin
        .from('votes')
        .select('*')
        .eq('song_id', voteInput.song_id)
        .eq('user_id', voteInput.user_id)
        .maybeSingle();

      if (checkError) {
        console.error(`[EF saveVote] Error checking vote (Song ID: ${voteInput.song_id}, User ID: ${voteInput.user_id}):`, checkError);
        throw new Error(`Failed to check vote. Code: ${checkError.code}, Message: ${checkError.message}`);
      }

      if (existingData) {
        existingVote = existingData;
        console.log(`[EF saveVote] Found existing vote: ID ${existingVote.id}, Count: ${existingVote.count}`);
      } else {
        console.log(`[EF saveVote] No existing vote found. Creating new vote.`);
      }
    } catch (checkError) {
      console.error("[EF saveVote] Unexpected error during vote existence check:", checkError);
      throw new Error(`Unexpected error checking vote: ${checkError instanceof Error ? checkError.message : String(checkError)}`);
    }

    // 2. Prepare data for upsert
    let voteCount = 1; // Default to 1 for new votes

    if (existingVote) {
      if (options.incrementBy !== undefined) {
        // Increment existing vote by the specified amount
        voteCount = existingVote.count + options.incrementBy;
      } else if (voteInput.count !== undefined) {
        // Use explicit count if provided
        voteCount = voteInput.count;
      } else {
        // Default: keep existing count
        voteCount = existingVote.count;
      }
    } else if (voteInput.count !== undefined) {
      // For new votes, use explicit count if provided
      voteCount = voteInput.count;
    }

    // Ensure vote count is positive
    voteCount = Math.max(voteCount, 0);

    const voteDataForUpsert = {
      song_id: voteInput.song_id,
      user_id: voteInput.user_id,
      count: voteCount,
      updated_at: new Date().toISOString()
    };
    
    // 3. Upsert the vote (insert or update)
    try {
      console.log(`[EF saveVote] Upserting vote with count ${voteCount}`);
      
      const { data: upsertedData, error: upsertError } = await supabaseAdmin
        .from('votes')
        // Correct upsert syntax for Supabase v2 - 'returning' is deprecated in upsert options
        .upsert(voteDataForUpsert, {
          onConflict: 'song_id,user_id', // Composite unique constraint
          // ignoreDuplicates: false // Default behavior is to update
        })
        .select() // Select after upsert to get the result
        .single();

      if (upsertError) {
        console.error(`[EF saveVote] FAILED vote upsert:`, upsertError);
        
        // Attempt to fetch again on conflict
        if (upsertError.code === '23505') {
          console.warn(`[EF saveVote] Upsert conflict, attempting to fetch existing vote again...`);
          const { data: conflictVote, error: fetchError } = await supabaseAdmin
            .from('votes')
            .select('*')
            .eq('song_id', voteInput.song_id)
            .eq('user_id', voteInput.user_id)
            .single();
            
          if (fetchError) {
            console.error(`[EF saveVote] Error fetching conflicted vote:`, fetchError);
          } else if (conflictVote) {
            console.log(`[EF saveVote] Found conflicted vote. Returning it.`);
            return conflictVote;
          }
        }

        // Handle foreign key violation (song_id references setlist_songs)
        if (upsertError.code === '23503') {
          console.error(`[EF saveVote] Foreign key violation. Check if setlist_song ID ${voteInput.song_id} exists.`);
        }
        
        throw new Error(`Failed to save vote. Code: ${upsertError.code}, Message: ${upsertError.message}`);
      }

      // 4. Update song vote_count in the setlist_songs table (async background task)
      if (existingVote?.count !== voteCount) {
        updateSetlistSongVoteCount(voteInput.song_id)
          .catch(err => console.error(`[EF saveVote] Error updating setlist song vote count:`, err));
      }

      console.log(`[EF saveVote] Successfully saved vote (ID: ${upsertedData.id}, Count: ${upsertedData.count})`);
      return upsertedData;
      
    } catch (saveError) {
      console.error("[EF saveVote] Error during vote upsert:", saveError);
      throw saveError;
    }
  } catch (error) {
    console.error("[EF saveVote] Unexpected top-level error:", error);
    return null;
  }
}

/**
 * Helper to update the vote_count on a setlist_song record
 * based on the sum of all associated votes
 */
async function updateSetlistSongVoteCount(setlistSongId: string): Promise<boolean> {
  try {
    console.log(`[EF updateSongVoteCount] Updating vote count for setlist_song ID: ${setlistSongId}`);
    
    // 1. Calculate total votes for this song
    const { data: votesData, error: countError } = await supabaseAdmin
      .from('votes')
      .select('count')
      .eq('song_id', setlistSongId);
      
    if (countError) {
      console.error(`[EF updateSongVoteCount] Error counting votes:`, countError);
      return false;
    }
    
    // Sum the count values
    const totalVotes = votesData.reduce((sum, vote) => sum + (vote.count || 0), 0);
    console.log(`[EF updateSongVoteCount] Calculated total votes: ${totalVotes}`);
    
    // 2. Update the setlist_song record
    const { error: updateError } = await supabaseAdmin
      .from('setlist_songs')
      .update({ 
        vote_count: totalVotes,
        updated_at: new Date().toISOString()
      })
      .eq('id', setlistSongId);
      
    if (updateError) {
      console.error(`[EF updateSongVoteCount] Error updating setlist_song:`, updateError);
      return false;
    }
    
    console.log(`[EF updateSongVoteCount] Successfully updated vote count to ${totalVotes}`);
    return true;
  } catch (error) {
    console.error(`[EF updateSongVoteCount] Unexpected error:`, error);
    return false;
  }
}
