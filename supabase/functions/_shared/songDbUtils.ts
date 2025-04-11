import { supabaseAdmin } from './supabaseClient.ts';
import type { SpotifyTrack } from './types.ts';
// Assuming Spotify API logic is moved to a shared utility or another function
import { getArtistAllTracks } from './spotifyUtils.ts'; // Adjust if Spotify logic is elsewhere

/**
 * Store artist songs in the database (used internally by fetchAndStoreArtistTracks)
 */
async function storeSongsInDatabase(artistId: string, tracks: SpotifyTrack[]) {
  if (!tracks || tracks.length === 0) return false; // Return boolean for consistency

  try {
    console.log(`Storing ${tracks.length} songs for artist ${artistId}`);

    const batchSize = 50; // Supabase recommends batch sizes around 50-100

    for (let i = 0; i < tracks.length; i += batchSize) {
      const batch = tracks.slice(i, i + batchSize);

      const songs = batch.map(track => ({
        // Assuming your 'songs' table has these columns
        // Generate a UUID for the song ID if your table requires it and it's not auto-generated
        // id: crypto.randomUUID(), // Uncomment if needed
        name: track.name,
        artist_id: artistId, // Ensure this artistId corresponds to the DB entry
        spotify_id: track.id,
        duration_ms: track.duration_ms,
        popularity: track.popularity || 0,
        preview_url: track.preview_url || null,
        updated_at: new Date().toISOString()
      }));

      // Use the admin client imported for Edge Functions
      const { error } = await supabaseAdmin
        .from('songs')
        .upsert(songs, {
          onConflict: 'spotify_id', // Ensure this constraint exists on your 'songs' table
          ignoreDuplicates: false // Update existing songs based on spotify_id
        });

      if (error) {
        console.error(`[storeSongsInDatabase] Error storing songs batch for artist ${artistId}:`, error);
        // Throw error to signal failure to the calling function
        throw new Error(`Failed to store song batch for artist ${artistId}. Code: ${error.code}, Message: ${error.message}`);
      }
    }

    console.log(`Successfully stored/updated ${tracks.length} songs for artist ${artistId}`);
    return true;
  } catch (error) {
    console.error(`Error in storeSongsInDatabase for artist ${artistId}:`, error);
    // Re-throw the error so fetchAndStoreArtistTracks knows it failed
    throw error;
  }
}


/**
 * Fetch and store artist tracks from Spotify
 * NOTE: Depends on getArtistAllTracks being available in the shared scope.
 */
export async function fetchAndStoreArtistTracks(
  artistId: string, // This should be the ID from your 'artists' table
  spotifyId: string,
  artistName: string // For logging
): Promise<boolean> {
  try {
    console.log(`Fetching Spotify tracks for artist ${artistName} (Spotify ID: ${spotifyId}, DB ID: ${artistId})`);

    // Get tracks from Spotify (ensure getArtistAllTracks handles auth via Deno.env)
    const tracksResult = await getArtistAllTracks(spotifyId); // Assuming this returns { tracks: SpotifyTrack[] } | null

    if (!tracksResult || !tracksResult.tracks || tracksResult.tracks.length === 0) {
      console.log(`No Spotify tracks found for artist ${artistName}`);
      return false; // Indicate no tracks found, but not necessarily an error
    }

    console.log(`Got ${tracksResult.tracks.length} Spotify tracks for artist ${artistName}`);

    // Store tracks in the songs table using the internal DB artist ID
    await storeSongsInDatabase(artistId, tracksResult.tracks);

    return true; // Indicate success
  } catch (error) {
    console.error(`Error in fetchAndStoreArtistTracks for ${artistName} (Spotify ID: ${spotifyId}):`, error);
    return false; // Indicate failure
  }
}

// NOTE: getStoredTracksForArtist and updateArtistStoredTracks might not be needed
// directly by the Edge Functions if the logic is self-contained, but can be kept
// here if other shared utilities might use them.

/**
 * Get stored tracks for an artist from the database
 */
export async function getStoredTracksForArtist(artistId: string) {
  try {
    const { data, error } = await supabaseAdmin
      .from('songs')
      .select('id, name, spotify_id, duration_ms, preview_url, popularity')
      .eq('artist_id', artistId)
      .order('popularity', { ascending: false });

    if (error) {
      console.error("Error fetching stored tracks for artist:", error);
      return null;
    }
    return data;
  } catch (error) {
    console.error("Error in getStoredTracksForArtist:", error);
    return null;
  }
}

/**
 * Save a single song to the database using Spotify ID for conflicts.
 * Fetches existing record first to avoid redundant updates.
 */
export async function saveSongToDatabase(songInput: Partial<Song>): Promise<Song | null> {
  try {
    // Ensure we have Spotify ID and name
    if (!songInput.spotify_id || !songInput.name) {
      console.error("[EF saveSong] Invalid input: Missing name or Spotify ID", songInput);
      return null;
    }
    console.log(`[EF saveSong] Processing song: ${songInput.name} (Spotify ID: ${songInput.spotify_id})`);

    // 1. Check if song exists by Spotify ID
    let existingSong: Song | null = null;
    try {
      const { data: existingData, error: checkError } = await supabaseAdmin
        .from('songs')
        .select('*') // Select all columns
        .eq('spotify_id', songInput.spotify_id)
        .maybeSingle();

      if (checkError) {
        console.error(`[EF saveSong] Error checking song ${songInput.name}:`, checkError);
        throw new Error(`Failed to check song ${songInput.name}. Code: ${checkError.code}, Message: ${checkError.message}`);
      }

      if (existingData) {
        existingSong = existingData as Song;
        console.log(`[EF saveSong] Found existing song: ID ${existingSong.id}`);
        // Optional: Check updated_at if needed for skipping updates
        // const lastUpdated = existingSong.updated_at ? new Date(existingSong.updated_at) : null; ...
        // For songs, frequent updates might be less critical unless popularity changes often
        // Let's assume we update if found for now, but this could be optimized.
        console.log(`[EF saveSong] Existing song ${songInput.name} found. Will update.`);
      } else {
        console.log(`[EF saveSong] Song ${songInput.name} is new.`);
      }
    } catch (checkError) {
      console.error("[EF saveSong] Unexpected error during song existence check:", checkError);
      throw new Error(`Unexpected error checking song ${songInput.name}: ${checkError instanceof Error ? checkError.message : String(checkError)}`);
    }

    // 2. Prepare data for upsert
    const songDataForUpsert: Partial<Song> = {
      ...(existingSong || {}),
      ...songInput,
      spotify_id: songInput.spotify_id, // Ensure Spotify ID is present
      name: songInput.name,
      artist_id: songInput.artist_id || existingSong?.artist_id || null, // Ensure artist link is present if provided
      duration_ms: songInput.duration_ms ?? existingSong?.duration_ms ?? null,
      popularity: songInput.popularity ?? existingSong?.popularity ?? 0,
      preview_url: songInput.preview_url || existingSong?.preview_url || null,
      // vote_count is likely managed separately by triggers or explicit updates, avoid setting here
      updated_at: new Date().toISOString(),
    };
    delete songDataForUpsert.id; // Remove UUID id before upsert
    delete (songDataForUpsert as any).vote_count; // Explicitly remove vote_count from upsert

    try {
      console.log(`[EF saveSong] Attempting upsert for song: ${songDataForUpsert.name} on conflict: spotify_id`);
      const { data: upsertedData, error: upsertError } = await supabaseAdmin
        .from('songs')
        .upsert(songDataForUpsert, {
          onConflict: 'spotify_id',
          ignoreDuplicates: false // Update on conflict
        })
        .select()
        .single();

      if (upsertError) {
        console.error(`[EF saveSong] FAILED upsert for song ${songInput.name}:`, upsertError);
        // Attempt fetch again on conflict
        if (upsertError.code === '23505') {
          console.warn(`[EF saveSong] Upsert conflict, attempting to fetch existing song again...`);
          const { data: conflictedSong, error: fetchError } = await supabaseAdmin
            .from('songs')
            .select('*')
            .eq('spotify_id', songInput.spotify_id)
            .maybeSingle();
           if (fetchError) console.error(`[EF saveSong] Error fetching conflicted song:`, fetchError);
           if (conflictedSong) {
             console.log(`[EF saveSong] Found conflicted song with ID: ${conflictedSong.id}. Returning it.`);
             return conflictedSong as Song;
           }
        }
        // Handle foreign key violation if artist_id is provided but invalid
        if (upsertError.code === '23503') {
            console.error(`[EF saveSong] Foreign key violation for song ${songInput.name}. Artist ID ${songInput.artist_id} likely invalid.`);
        }
        throw new Error(`Failed to save song ${songInput.name}. Code: ${upsertError.code}, Message: ${upsertError.message}`);
      }

      const savedDbSong = upsertedData as Song;
      console.log(`[EF saveSong] Successfully saved/updated song ${savedDbSong.name} (DB ID: ${savedDbSong.id})`);
      return savedDbSong; // Return the full saved DB record

    } catch (saveError) {
      console.error("[EF saveSong] Error during upsert attempt:", saveError);
      throw saveError;
    }
  } catch (error) {
    console.error("[EF saveSong] Unexpected top-level error:", error);
    throw new Error(`Unexpected error processing song ${songInput?.name}: ${error instanceof Error ? error.message : String(error)}`);
  }
}