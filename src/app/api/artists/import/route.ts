import { adminClient } from '../../../../lib/db'; // Use adminClient for updates
import { saveArtistToDatabase, saveShowToDatabase } from '../../../../lib/api/database-utils';
import { fetchArtistEvents } from '../../../../lib/api/shows';
import { getArtistByName } from '../../../../lib/spotify/artist-search'; // Import Spotify search function
import { SpotifyArtist } from '../../../../lib/spotify/types'; // Import Spotify types if needed
import { Artist, Show } from '../../../../lib/types';

/**
 * POST /api/artists/import
 * Imports an artist and their upcoming shows into the database.
 * Expects artist data in the request body.
 */
export async function POST(request: Request) {
  try {
    const artistData = await request.json() as Artist;

    // 1. Validate incoming artist data
    if (!artistData || !artistData.id || !artistData.name) {
      return new Response(JSON.stringify({ error: 'Invalid artist data provided' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    console.log(`[API /artists/import] Received import request for artist: ${artistData.name} (ID: ${artistData.id})`);

    // 2. Save the artist to the database
    let savedArtist = await saveArtistToDatabase(artistData); // Use let to allow modification
    if (!savedArtist) {
      // saveArtistToDatabase logs errors internally but returns original on failure
      console.error(`[API /artists/import] Failed to save artist ${artistData.name}. Aborting show import.`);
      // Return success even if artist save failed internally, as it might already exist and be up-to-date
      // Or return an error if strict failure is desired:
      // return new Response(JSON.stringify({ error: 'Failed to save artist to database' }), {
      //   status: 500,
      //   headers: { 'Content-Type': 'application/json' },
      // });
    } else {
       console.log(`[API /artists/import] Successfully saved/updated artist: ${savedArtist.name}`);
    }

    // 2.5 Fetch and update Spotify ID if missing
    if (savedArtist && !savedArtist.spotify_id) {
      console.log(`[API /artists/import] Artist ${savedArtist.name} is missing Spotify ID. Fetching...`);
      try {
        const spotifyArtistResult: SpotifyArtist | null = await getArtistByName(savedArtist.name);

        if (spotifyArtistResult && spotifyArtistResult.id) {
          const spotify_id = spotifyArtistResult.id;
          const spotify_url = spotifyArtistResult.external_urls?.spotify;
          const popularity = spotifyArtistResult.popularity;
          const followers = spotifyArtistResult.followers?.total;

          console.log(`[API /artists/import] Found Spotify ID for ${savedArtist.name}: ${spotify_id}`);

          const { error: updateError } = await adminClient()
            .from('artists')
            .update({
              spotify_id: spotify_id,
              spotify_url: spotify_url,
              popularity: popularity,
              followers: followers,
              updated_at: new Date().toISOString() // Ensure updated_at reflects this change
            })
            .eq('id', savedArtist.id); // Use Ticketmaster ID as primary key

          if (updateError) {
            console.error(`[API /artists/import] Failed to update artist ${savedArtist.name} with Spotify ID ${spotify_id}:`, updateError);
          } else {
            console.log(`[API /artists/import] Successfully updated artist ${savedArtist.name} with Spotify ID.`);
            // Update in-memory object
            savedArtist = {
              ...savedArtist,
              spotify_id: spotify_id,
              spotify_url: spotify_url,
              popularity: popularity,
              followers: followers,
            };
          }
        } else {
          console.log(`[API /artists/import] Could not find Spotify ID for artist ${savedArtist.name}.`);
        }
      } catch (spotifyError) {
        console.error(`[API /artists/import] Error fetching Spotify ID for ${savedArtist.name}:`, spotifyError);
      }
    }

    // Use the potentially updated artist ID from the save operation (or original if save failed)
    const artistIdToFetch = savedArtist?.id || artistData.id;

    // 3. Fetch upcoming events for the artist from Ticketmaster
    console.log(`[API /artists/import] Fetching events for artist ID: ${artistIdToFetch}`);
    const shows = await fetchArtistEvents(artistIdToFetch);
    console.log(`[API /artists/import] Found ${shows.length} events for artist ID: ${artistIdToFetch}`);

    if (!shows || shows.length === 0) {
      console.log(`[API /artists/import] No upcoming shows found for artist ${artistData.name}. Import complete.`);
      return new Response(JSON.stringify({ success: true, message: 'Artist saved, no upcoming shows found.', artist: savedArtist }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 4. Save each show to the database
    let savedCount = 0;
    let failedCount = 0;
    for (const show of shows) {
      try {
        // Ensure the show has the correct artist_id linked
        const showToSave = { ...show, artist_id: artistIdToFetch };
        const savedShow = await saveShowToDatabase(showToSave as Show); // Cast needed
        if (savedShow) {
          savedCount++;
        } else {
          failedCount++;
        }
      } catch (showError) {
        console.error(`[API /artists/import] Error saving show ${show.id} for artist ${artistData.name}:`, showError);
        failedCount++;
      }
    }

    console.log(`[API /artists/import] Finished importing shows for ${artistData.name}. Saved: ${savedCount}, Failed: ${failedCount}`);

    return new Response(JSON.stringify({
      success: true,
      message: `Artist saved. Imported ${savedCount} shows (${failedCount} failures).`,
      artist: savedArtist,
      savedShows: savedCount,
      failedShows: failedCount
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    let errorMessage = "Unknown error during artist import";
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    console.error("[API /artists/import] Error:", error);
    return new Response(JSON.stringify({ error: "Server error during artist import", details: errorMessage }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}