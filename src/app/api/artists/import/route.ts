import { adminClient } from '../../../../lib/db';
import { saveArtistToDatabase, saveShowToDatabase } from '../../../../lib/api/database-utils';
import { fetchArtistEvents } from '../../../../lib/api/shows';
import { getArtistByName } from '../../../../lib/spotify/artist-search';
import { SpotifyArtist } from '../../../../lib/spotify/types';
import { Artist, Show } from '../../../../lib/types';

export async function POST(request: Request) {
  try {
    const artistData = await request.json() as Artist;

    // Validate incoming artist data
    if (!artistData || !artistData.id || !artistData.name) {
      return new Response(JSON.stringify({ error: 'Invalid artist data provided' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    console.log(`[API /artists/import] Importing artist: ${artistData.name} (${artistData.id})`);

    let savedArtist = await saveArtistToDatabase(artistData);
    if (!savedArtist) {
      console.error(`[API /artists/import] Failed to save artist: ${artistData.name}`);
      return new Response(JSON.stringify({ error: 'Failed to save artist to database' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!savedArtist.spotify_id) {
      const spotifyArtistResult: SpotifyArtist | null = await getArtistByName(savedArtist.name);
      if (spotifyArtistResult?.id) {
        const spotifyUpdate = await adminClient()
          .from('artists')
          .update({
            spotify_id: spotifyArtistResult.id,
            spotify_url: spotifyArtistResult.external_urls.spotify,
            popularity: spotifyArtistResult.popularity,
            followers: spotifyArtistResult.followers.total,
            updated_at: new Date().toISOString()
          })
          .eq('id', savedArtist.id);

        if (!spotifyUpdate.error) {
          savedArtist = { ...savedArtist, spotify_id: spotifyArtistResult.id };
        }
      }
    }

    const shows = await fetchArtistEvents(savedArtist.id);
    if (!shows || shows.length === 0) {
      return new Response(JSON.stringify({ success: true, message: 'Artist saved, no upcoming shows found.', artist: savedArtist }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    let savedCount = 0, failedCount = 0;
    for (const show of shows) {
      try {
        const showToSave = { ...show, artist_id: savedArtist.id };
        const savedShow = await saveShowToDatabase(showToSave);
        if (savedShow) savedCount++;
        else failedCount++;
      } catch (err) {
        console.error(`[API /artists/import] Error processing show ${show.id}:`, err);
        failedCount++;
      }
    }

    return new Response(JSON.stringify({
      success: true,
      message: `Artist imported successfully. Shows imported: ${savedCount}, failed: ${failedCount}.`,
      artist: savedArtist,
      savedShows: savedCount,
      failedShows: failedCount
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    let errorMessage = "Unknown error during artist import";
    if (error instanceof Error) errorMessage = error.message;
    console.error("[API /artists/import] Error:", error);
    return new Response(JSON.stringify({ error: "Server error during artist import", details: errorMessage }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}