import { adminClient } from '@/lib/db'; // Import adminClient to bypass RLS
import { fetchAndStoreArtistTracks } from "./database";
import type { Artist, Venue, Show } from '@/lib/types';
// import { syncVenueShows } from "@/app/api/sync/venue"; // Removed: Triggering sync is now handled server-side
// Import createSetlistForShow dynamically to avoid circular dependencies

// Types are now imported from @/lib/types

/**
 * Save an artist to the database handling permission errors gracefully
 */
export async function saveArtistToDatabase(artist: Artist) {
  try {
    if (!artist || !artist.id || !artist.name) {
      console.error("Invalid artist object:", artist);
      return null;
    }

    console.log(`[saveArtistToDatabase] Processing artist: ${artist?.name} (ID: ${artist?.id})`);

    console.log(`Saving artist to database: ${artist.name} (ID: ${artist.id})`);

    // Check if artist already exists
    try {
      const { data: existingArtist, error: checkError } = await adminClient()
        .from('artists')
        .select('id, updated_at, spotify_id')
        .or(`id.eq.${artist.id},spotify_id.eq.${artist.spotify_id}`)
        .maybeSingle();

      if (checkError) {
        // If we get a permission error log but continue (return the original artist)
        if (checkError.code === '42501') { // permission denied error
          console.log(`Permission denied when checking artist ${artist.name} in database - continuing with API data`);
          return artist;
        }

        console.error(`[saveArtistToDatabase] Error checking artist ${artist.name}:`, checkError);
        // Throw error on check failure
        throw new Error(`Failed to check artist ${artist.name} in database. Code: ${checkError.code}, Message: ${checkError.message}`);
      }

      // If artist exists and was updated recently don't update
      if (existingArtist) {
        const lastUpdated = new Date(existingArtist.updated_at);
        const now = new Date();
        const daysSinceUpdate = (now.getTime() - lastUpdated.getTime()) / (1000 * 60 * 60 * 24);

        // Only update if it's been more than 7 days
        if (daysSinceUpdate < 7) {
          console.log(`Artist ${artist.name} was updated ${daysSinceUpdate.toFixed(1)} days ago, skipping update`);

          // If artist has Spotify ID but no tracks fetch them in background
          if (existingArtist.spotify_id && artist.spotify_id) {
            fetchAndStoreArtistTracks(existingArtist.id, existingArtist.spotify_id, artist.name)
              .catch(err => console.error(`Background track fetch error:`, err));
          }

          return existingArtist;
        }

        console.log(`Artist ${artist.name} needs update (last updated ${daysSinceUpdate.toFixed(1)} days ago)`);
      } else {
        console.log(`Artist ${artist.name} is new, creating in database`);
        console.log(`[saveArtistToDatabase] Artist ${artist.name} is new.`);

      }
    } catch (checkError) {
      console.error("[saveArtistToDatabase] Unexpected error during artist existence check:", checkError);
      // Throw error instead of continuing
      throw new Error(`Unexpected error checking if artist ${artist.name} exists: ${checkError instanceof Error ? checkError.message : String(checkError)}`);
    }

    // Prepare artist data
    const artistData = {
      id: artist.id,
      name: artist.name,
      image_url: artist.image_url, // Corrected field name
      spotify_id: artist.spotify_id,
      spotify_url: artist.spotify_url,
      popularity: artist.popularity || 0,
      followers: artist.followers || 0,
      updated_at: new Date().toISOString()
    };

    // Insert or update artist
    try {
      console.log('[saveArtistToDatabase] Prepared artistData for upsert:', JSON.stringify(artistData));
      console.log(`[saveArtistToDatabase] Attempting upsert for artist: ${artistData.name}`);

      const { data, error } = await adminClient()
        .from('artists')
        .upsert(artistData)
        .select();

      if (error) {
        // !! MODIFICATION: Throw error on ANY upsert failure instead of returning original object
        console.error(`[saveArtistToDatabase] FAILED upsert for artist ${artist.name}:`, error);
        throw new Error(`Failed to save artist ${artist.name} to database. Code: ${error.code}, Message: ${error.message}`);
        // Old logic returning original object removed
      }

      console.log(`[saveArtistToDatabase] Successfully saved/updated artist ${artist.name}`);

      console.log(`Successfully saved artist ${artist.name} to database`);

      // If artist has Spotify ID fetch their tracks in the background
      if (artist.spotify_id) {
        fetchAndStoreArtistTracks(artist.id, artist.spotify_id, artist.name)
          .catch(err => console.error(`Error fetching tracks for artist ${artist.name}:`, err));
      }

      return data?.[0] || artist;
    } catch (saveError) {
      console.error("[saveArtistToDatabase] Error during upsert attempt:", saveError);
      // Re-throw the error caught during save attempt
      throw saveError;
    }
  } catch (error) {
    console.error("[saveArtistToDatabase] Unexpected top-level error:", error);
    // Re-throw unexpected errors
    throw new Error(`Unexpected error processing artist ${artist?.name}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Save a venue to the database handling permission errors gracefully
 */
export async function saveVenueToDatabase(venue: Venue) {
  try {
    if (!venue || !venue.id || !venue.name) {
      console.error("Invalid venue object:", venue);
      return null;
    }

    console.log(`Processing venue: ${venue.name} (ID: ${venue.id})`);

    // Check if venue already exists
    try {
      const { data: existingVenue, error: checkError } = await adminClient()
        .from('venues')
        .select('id, updated_at')
        .or(`id.eq.${venue.id},ticketmaster_id.eq.${venue.ticketmaster_id}`)
        .maybeSingle();

      if (checkError) {
        // If we get a permission error log but continue (return the original venue)
        // Using adminClient, permission errors indicate a problem
        // if (checkError.code === '42501') { // permission denied error
        //   console.log(`Permission denied when checking venue ${venue.name} in database - continuing with API data`);
        //   return venue; // OLD LOGIC
        // }

        console.error(`[saveVenueToDatabase] Error checking venue ${venue.name}:`, checkError);
        // Throw error on check failure
        throw new Error(`Failed to check venue ${venue.name} in database. Code: ${checkError.code}, Message: ${checkError.message}`);
      }

      // If venue exists and was updated recently don't update
      if (existingVenue) {
        const lastUpdated = new Date(existingVenue.updated_at);
        const now = new Date();
        const daysSinceUpdate = (now.getTime() - lastUpdated.getTime()) / (1000 * 60 * 60 * 24);

        // Only update if it's been more than 30 days
        if (daysSinceUpdate < 30) {
          console.log(`Venue ${venue.name} was updated ${daysSinceUpdate.toFixed(1)} days ago, skipping update`);
          return existingVenue;
        }

        console.log(`Venue ${venue.name} needs update (last updated ${daysSinceUpdate.toFixed(1)} days ago)`);
      } else {
        console.log(`Venue ${venue.name} is new, creating in database`);
      }
    } catch (checkError) {
      console.error("[saveVenueToDatabase] Unexpected error during venue existence check:", checkError);
      // Throw error instead of continuing
      throw new Error(`Unexpected error checking if venue ${venue.name} exists: ${checkError instanceof Error ? checkError.message : String(checkError)}`);
    }

    // Insert or update venue
    try {
      const { data, error } = await adminClient()
        .from('venues')
        .upsert({
          id: venue.id,
          name: venue.name,
          city: venue.city,
          state: venue.state,
          country: venue.country,
          address: venue.address,
          postal_code: venue.postal_code,
          image_url: venue.image_url,
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        // If we get a permission error log but continue (return the original venue)
        // Using adminClient, permission errors indicate a problem
        // if (error.code === '42501') { // permission denied error
        //   console.log(`Permission denied when saving venue ${venue.name} to database - continuing with API data`);
        //   return venue; // OLD LOGIC
        // }

        console.error(`[saveVenueToDatabase] FAILED upsert for venue ${venue.name}:`, error);
        // Throw error on ANY upsert failure
        throw new Error(`Failed to save venue ${venue.name} to database. Code: ${error.code}, Message: ${error.message}`);
      }

      console.log(`Successfully saved venue ${venue.name} to database`);
      
      return data || venue; // Return saved data or original object
    } catch (saveError) {
      console.error("[saveVenueToDatabase] Error during upsert attempt:", saveError);
      // Re-throw the error caught during save attempt
      throw saveError;
    }
  } catch (error) {
    console.error("[saveVenueToDatabase] Unexpected top-level error:", error);
    // Re-throw unexpected errors
    throw new Error(`Unexpected error processing venue ${venue?.name}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Save a show to the database, optionally triggering a full venue sync.
 * Handles permission errors gracefully.
 * @param show The show object to save.
 * @param options Optional parameters.
 * @param options.triggeredBySync Flag to prevent infinite sync loops. Defaults to false.
 */
export async function saveShowToDatabase(show: Show, options: { triggeredBySync?: boolean } = {}) {
  const { triggeredBySync = false } = options; // Destructure with default
  try {
    if (!show || !show.id) {
      console.error("Invalid show object:", show);
      return null;
    }

    console.log(`Processing show: ${show.name} (ID: ${show.id})${triggeredBySync ? ' [Sync Triggered]' : ''}`);

    // Check if show already exists
    try {
      const { data: existingShow, error: checkError } = await adminClient()
        .from('shows')
        .select('id, updated_at, artist_id, venue_id')
        .or(`id.eq.${show.id},ticketmaster_id.eq.${show.ticketmaster_id}`)
        .maybeSingle();

      if (checkError) {
        // If we get a permission error log but continue (return the original show)
        // Using adminClient, permission errors indicate a problem
        // if (checkError.code === '42501') { // permission denied error
        //   console.log(`Permission denied when checking show ${show.name} in database - continuing with API data`);
        //   return show; // OLD LOGIC
        // }

        console.error(`[saveShowToDatabase] Error checking show ${show.name}:`, checkError);
        // Throw error on check failure
        throw new Error(`Failed to check show ${show.name} in database. Code: ${checkError.code}, Message: ${checkError.message}`);
      }

      // If show exists and was updated recently don't update
      if (existingShow) {
        const lastUpdated = new Date(existingShow.updated_at);
        const now = new Date();
        const hoursSinceUpdate = (now.getTime() - lastUpdated.getTime()) / (1000 * 60 * 60);

        // Only update if it's been more than 24 hours
        if (hoursSinceUpdate < 24) {
          console.log(`Show ${show.name} was updated ${hoursSinceUpdate.toFixed(1)} hours ago, skipping update`);
          return existingShow;
        }

        console.log(`Show ${show.name} needs update (last updated ${hoursSinceUpdate.toFixed(1)} hours ago)`);
      } else {
        console.log(`Show ${show.name} is new, creating in database`);
      }
    } catch (checkError) {
      console.error("[saveShowToDatabase] Unexpected error during show existence check:", checkError);
      // Throw error instead of continuing
      throw new Error(`Unexpected error checking if show ${show.name} exists: ${checkError instanceof Error ? checkError.message : String(checkError)}`);
    }

    // Ensure artist and venue exist before saving the show
    let artistId = show.artist_id;
    let venueId = show.venue_id;
    let venueName = show.venue?.name; // Store venue name for the async sync call

    if (show.artist && typeof show.artist === 'object') {
      // Pass triggeredBySync flag down if necessary, though saveArtistToDatabase doesn't trigger venue sync directly
      const savedArtist = await saveArtistToDatabase(show.artist);
      artistId = savedArtist?.id || artistId;
    }

    if (show.venue && typeof show.venue === 'object') {
      // Pass triggeredBySync flag down if saveVenueToDatabase also needs loop prevention
      const savedVenue = await saveVenueToDatabase(show.venue);
      venueId = savedVenue?.id || venueId;
      venueName = savedVenue?.name || venueName; // Get venue name from saved venue if possible
    }

    // Abort if essential IDs are missing after trying to save artist/venue
    if (!artistId || !venueId) {
      console.error(`[saveShowToDatabase] Cannot save show ${show.name}, missing artistId (${artistId}) or venueId (${venueId}) after attempting to save dependencies.`);
      // Throw error as saving cannot proceed
      throw new Error(`Cannot save show ${show.name}, missing required artistId or venueId.`);
    }

    // Upsert the show
    const { data, error } = await adminClient()
      .from('shows')
      .upsert({
        id: show.id,
        name: show.name,
        date: show.date,
        ticket_url: show.ticket_url,
        image_url: show.image_url,
        artist_id: artistId,
        venue_id: venueId,
        popularity: show.popularity || 0,
        updated_at: new Date().toISOString()
      })
      .select()
      .single(); // Use single() if upsert returns an array with one item

    if (error) {
      // Using adminClient, permission errors indicate a problem
      // if (error.code === '42501') {
      //   console.log(`Permission denied when saving show ${show.name}`);
      //   return show; // OLD LOGIC
      // }
      console.error(`[saveShowToDatabase] FAILED upsert for show ${show.name}:`, error);
      // Throw error on ANY upsert failure
      throw new Error(`Failed to save show ${show.name} to database. Code: ${error.code}, Message: ${error.message}`);
    }

    const savedShow = data; // data should be the single saved show object
    console.log(`Successfully saved show ${show.name} to database`);
// --- Automatic Venue Sync Trigger ---
// If this save wasn't triggered by a sync itself, and we have a venue ID,
// trigger the background sync for this venue.
if (!triggeredBySync && venueId) {
  console.log(`[saveShowToDatabase] Triggering background sync for venue ID: ${venueId} (Show: ${savedShow.name})`);
  // Use the venue's Ticketmaster ID if available, otherwise the internal ID might need mapping
  const venueTmId = show.venue?.ticketmaster_id || show.venue?.id; // Prefer explicit TM ID if available

  if (venueTmId) {
     // Fire-and-forget fetch call to the sync endpoint
     fetch('/api/sync/venue', { // Use relative path for API route
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({
         venueId: venueId, // Our internal DB ID
         ticketmasterVenueId: venueTmId // The ID needed by fetchVenueEvents
        }),
     })
     .then(async (res) => {
       if (!res.ok) {
         const errorData = await res.json().catch(() => ({})); // Try to parse error
         console.error(`[saveShowToDatabase] Background venue sync call failed for venue ${venueId} (TM ID: ${venueTmId}). Status: ${res.status}`, errorData);
       } else {
         console.log(`[saveShowToDatabase] Background venue sync call initiated successfully for venue ${venueId} (TM ID: ${venueTmId}).`);
       }
     })
     .catch(error => {
       console.error(`[saveShowToDatabase] Error initiating background venue sync call for venue ${venueId} (TM ID: ${venueTmId}):`, error);
     });
  } else {
      console.warn(`[saveShowToDatabase] Cannot trigger background sync for venue associated with show ${savedShow.name}: Missing Ticketmaster Venue ID.`);
  }
}

    // Create a setlist for *this specific* show if it doesn't exist
    // Ensure artistId is valid before proceeding
    if (artistId) {
        try {
            const setlistId = await createSetlistDirectly(savedShow.id, artistId);
            if (setlistId) {
                console.log(`[saveShowToDatabase] Ensured setlist exists for show ${savedShow.id}: ${setlistId}`);
                // Add setlist_id to the returned object if created/found
                savedShow.setlist_id = setlistId;
            }
        } catch (setlistError) {
            // Log the error but don't let it block returning the saved show
            console.error(`[saveShowToDatabase] Error ensuring setlist for show ${savedShow.id}:`, setlistError);
        }
    } else {
        console.warn(`[saveShowToDatabase] Cannot create setlist for show ${savedShow.id}: Missing artistId.`);
    }

    return savedShow; // Return the saved show object

  } catch (error) {
    console.error("[saveShowToDatabase] Unexpected top-level error:", error);
    // Re-throw unexpected errors
    throw new Error(`Unexpected error processing show ${show?.name}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Create a setlist for a show and populate it with songs - directly implemented
 * to avoid circular dependencies
 */
export async function createSetlistDirectly(showId: string, artistId: string) { // Add export
  try {
    console.log(`Creating setlist for show ${showId}`);
    
    // Check if setlist already exists
    const { data: existingSetlist, error: checkError } = await adminClient()
      .from('setlists')
      .select('id')
      .eq('show_id', showId)
      .maybeSingle();
    
    if (checkError) {
      console.error(`[createSetlistDirectly] Error checking for existing setlist for show ${showId}:`, checkError);
      throw new Error(`Failed to check for existing setlist for show ${showId}. Code: ${checkError.code}, Message: ${checkError.message}`);
    }
    
    // If setlist exists, return its ID
    if (existingSetlist) {
      console.log(`Setlist already exists for show ${showId}: ${existingSetlist.id}`);
      return existingSetlist.id;
    }
    
    // Get show details for date and venue information
    const { data: show, error: showError } = await adminClient()
      .from('shows')
      .select('date, venue_id, venues(name, city)')
      .eq('id', showId)
      .single();
    
    if (showError || !show) {
      console.error(`[createSetlistDirectly] Error getting show details for show ${showId}:`, showError);
      throw new Error(`Failed to get details for show ${showId}. Code: ${showError.code}, Message: ${showError.message}`);
    }
    
    // Create new setlist
    const { data: newSetlist, error: createError } = await adminClient()
      .from('setlists')
      .insert({
        artist_id: artistId,
        show_id: showId,
        date: show.date,
        venue: show.venues?.[0]?.name || null, // Access first element of array
        venue_city: show.venues?.[0]?.city || null, // Access first element of array
      })
      .select()
      .single();
    
    if (createError) {
      console.error(`[createSetlistDirectly] Error creating setlist for show ${showId}:`, createError);
      throw new Error(`Failed to create setlist for show ${showId}. Code: ${createError.code}, Message: ${createError.message}`);
    }
    
    console.log(`Created setlist ${newSetlist.id} for show ${showId}`);
    
    // Populate setlist with songs
    await populateSetlistSongs(newSetlist.id, artistId);
    
    return newSetlist.id;
  } catch (error) {
    console.error(`[createSetlistDirectly] Unexpected error for show ${showId}:`, error);
    throw new Error(`Unexpected error creating setlist for show ${showId}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Populate setlist with songs from the artist's catalog
 */
async function populateSetlistSongs(setlistId: string, artistId: string) {
  try {
    // Get artist's songs from the database
    const { data: songs, error: songsError } = await adminClient()
      .from('songs')
      .select('id, name, spotify_id, duration_ms, preview_url, popularity')
      .eq('artist_id', artistId)
      .order('popularity', { ascending: false })
      .limit(50);
    
    if (songsError) {
      console.error(`[populateSetlistSongs] Error fetching songs for artist ${artistId}:`, songsError);
      throw new Error(`Failed to fetch songs for artist ${artistId}. Code: ${songsError.code}, Message: ${songsError.message}`);
    }
    
    // If we don't have songs, fetch them from Spotify
    if (!songs || songs.length === 0) {
      // Get the artist's Spotify ID
      const { data: artist, error: artistError } = await adminClient()
        .from('artists')
        .select('spotify_id')
        .eq('id', artistId)
        .maybeSingle();
      
      if (artistError || !artist?.spotify_id) {
        console.error(`[populateSetlistSongs] Error getting Spotify ID for artist ${artistId}:`, artistError);
        throw new Error(`Failed to get Spotify ID for artist ${artistId}. Code: ${artistError?.code}, Message: ${artistError?.message}`);
      }
      
      // Fetch songs from Spotify
      await fetchAndStoreArtistTracks(artistId, artist.spotify_id, "Artist");
      
      // Try again to get songs
      const { data: refreshedSongs, error: refreshError } = await adminClient()
        .from('songs')
        .select('id, name, spotify_id, duration_ms, preview_url, popularity')
        .eq('artist_id', artistId)
        .order('popularity', { ascending: false })
        .limit(50);
      
      if (refreshError || !refreshedSongs || refreshedSongs.length === 0) {
        console.error(`[populateSetlistSongs] Still couldn't get songs for artist ${artistId} after fetching from Spotify:`, refreshError);
        throw new Error(`Failed to get refreshed songs for artist ${artistId}. Code: ${refreshError?.code}, Message: ${refreshError?.message}`);
      }
      
      // Add songs to setlist
      return await addSongsToSetlistInternal(setlistId, artistId, refreshedSongs);
    }
    
    // Add songs to setlist if we have them
    return await addSongsToSetlistInternal(setlistId, artistId, songs);
  } catch (error) {
    console.error(`[populateSetlistSongs] Unexpected error for setlist ${setlistId}:`, error);
    throw new Error(`Unexpected error populating setlist ${setlistId}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Add songs to a setlist - internal implementation
 */
async function addSongsToSetlistInternal(setlistId: string, artistId: string, songs: {
  id: string;
  name: string;
  spotify_id?: string;
  duration_ms?: number;
  preview_url?: string | null;
  popularity?: number;
}[]) {
  try {
    // Select 5 random songs from the top songs
    const selectedSongs = songs
      .sort(() => 0.5 - Math.random())
      .slice(0, 5);
    
    if (selectedSongs.length === 0) {
      console.error("No songs available to add to setlist");
      return false;
    }
    
    // Prepare setlist songs data
    const setlistSongs = selectedSongs.map((song, index) => ({
      setlist_id: setlistId,
      song_id: song.id,
      name: song.name,
      position: index + 1,
      artist_id: artistId,
      vote_count: 0
    }));
    
    // Insert setlist songs
    const { error } = await adminClient()
      .from('setlist_songs')
      .insert(setlistSongs);
    
    if (error) {
      console.error(`[addSongsToSetlistInternal] Error adding songs to setlist ${setlistId}:`, error);
      throw new Error(`Failed to add songs to setlist ${setlistId}. Code: ${error.code}, Message: ${error.message}`);
    }
    
    console.log(`Added ${setlistSongs.length} songs to setlist ${setlistId}`);
    return true;
  } catch (error) {
    console.error(`[addSongsToSetlistInternal] Unexpected error for setlist ${setlistId}:`, error);
    throw new Error(`Unexpected error adding songs to setlist ${setlistId}: ${error instanceof Error ? error.message : String(error)}`);
  }
}
