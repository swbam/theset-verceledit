/**
 * Unified Sync Function v2
 * Responsible for importing and syncing artists, shows, and songs from Ticketmaster and Spotify APIs into Supabase
 */

// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.181.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import {
  fetchSpotifyArtist,
  fetchSpotifyArtistTracks,
  fetchTicketmasterShows,
  fetchSetlists,
  extractVenueFromShow,
  extractSetlistSongs
} from "./api.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_KEY");

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  throw new Error("Missing Supabase environment variables");
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Helper: Fetch secret from Supabase vault
async function getSecret(secretName: string): Promise<string> {
  const { data, error } = await supabase.rpc("get_secret", { name: secretName });
  if (error || !data) throw new Error(`Secret fetch failed: ${secretName}`);
  return data;
}

// Helper: Logging
function log(msg: string, meta: any = {}) {
  console.log(`[SYNC] ${msg}`, meta);
}

// Helper: Retry logic
async function retry<T>(fn: () => Promise<T>, retries = 3, delayMs = 500): Promise<T> {
  let lastErr;
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      await new Promise(res => setTimeout(res, delayMs));
    }
  }
  throw lastErr;
}

// Zod schemas for validation
const ArtistSchema = z.object({
  name: z.string(),
  spotify_id: z.string().optional(),
  setlist_fm_id: z.string().optional(),
  ticketmaster_id: z.string().optional(),
  image_url: z.string().optional(),
  genres: z.array(z.string()).optional(),
  followers: z.number().optional(),
  popularity: z.number().optional(),
  stored_tracks: z.any().optional(),
});

const ShowSchema = z.object({
  artist_id: z.string(),
  tm_event_id: z.string(),
  show_time: z.string(),
  venue_id: z.string().optional(),
});

const SongSchema = z.object({
  artist_id: z.string(),
  name: z.string(),
  spotify_id: z.string().optional(),
  setlist_fm_id: z.string().optional(),
  duration_ms: z.number().optional(),
});

/**
 * Main sync handler
 * Accepts JSON body: { artistSpotifyId: string }
 * - Fetches artist and tracks from Spotify
 * - Fetches shows from Ticketmaster
 * - Upserts all data into Supabase
 */
serve(async (req: Request) => {
  try {
    const { artistSpotifyIds = [], batch = false } = await req.json();

    // Fetch secrets at runtime
    const SPOTIFY_CLIENT_ID = await getSecret("SPOTIFY_CLIENT_ID");
    const SPOTIFY_CLIENT_SECRET = await getSecret("SPOTIFY_CLIENT_SECRET");
    const TICKETMASTER_API_KEY = await getSecret("TICKETMASTER_API_KEY");
    const SETLIST_FM_API_KEY = await getSecret("SETLIST_FM_API_KEY");

    const results: any[] = [];
    for (const artistSpotifyId of artistSpotifyIds) {
      try {
        log("Syncing artist", { artistSpotifyId });

        // 1. Authenticate with Spotify
        const spotifyTokenRes = await retry(() =>
          fetch("https://accounts.spotify.com/api/token", {
            method: "POST",
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
              "Authorization": "Basic " + btoa(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`)
            },
            body: "grant_type=client_credentials"
          })
        );
        if (!spotifyTokenRes.ok) throw new Error("Spotify token fetch failed");
        const { access_token } = await spotifyTokenRes.json();

        // 2. Fetch artist and tracks from Spotify
        const artistData = await retry(() => fetchSpotifyArtist(artistSpotifyId, access_token));
        const tracks = await retry(() => fetchSpotifyArtistTracks(artistSpotifyId, access_token));

        // 3. Upsert artist
        const artistPayload = {
          name: artistData.name,
          spotify_id: artistData.id,
          image_url: artistData.images?.[0]?.url,
          genres: artistData.genres,
          followers: artistData.followers?.total,
          popularity: artistData.popularity,
          stored_tracks: tracks.map((t: any) => ({
            name: t.name,
            id: t.id,
            duration_ms: t.duration_ms,
            popularity: t.popularity
          }))
        };
        const { data: upsertedArtist, error: artistError } = await supabase
          .from("artists")
          .upsert(artistPayload, { onConflict: "spotify_id" })
          .select();
        if (artistError) throw artistError;
        const artistId = upsertedArtist?.[0]?.id;

        // 4. Upsert tracks (songs)
        for (const t of tracks) {
          const songPayload = {
            artist_id: artistId,
            name: t.name,
            spotify_id: t.id,
            duration_ms: t.duration_ms
          };
          const { error: songError } = await supabase
            .from("songs")
            .upsert(songPayload, { onConflict: "artist_id" });
          if (songError) throw songError;
        }

        // 5. Fetch shows from Ticketmaster
        const shows = await retry(() => fetchTicketmasterShows(artistData.name, TICKETMASTER_API_KEY));

        // 6. Upsert venues and shows
        for (const show of shows) {
          // Venue
          const venue = extractVenueFromShow(show);
          let venueId = null;
          if (venue) {
            const { data: upsertedVenue, error: venueError } = await supabase
              .from("venues")
              .upsert(venue, { onConflict: "tm_venue_id" })
              .select();
            if (venueError) throw venueError;
            venueId = upsertedVenue?.[0]?.id;
          }
          // Show
          const showPayload = {
            artist_id: artistId,
            tm_event_id: show.id,
            show_time: show.dates?.start?.dateTime,
            venue_id: venueId
          };
          const { data: upsertedShow, error: showError } = await supabase
            .from("shows")
            .upsert(showPayload, { onConflict: "tm_event_id" })
            .select();
          if (showError) throw showError;
          const showId = upsertedShow?.[0]?.id;

          // 7. Fetch setlists from Setlist.fm (if MBID available)
          if (artistData.external_ids?.mbid && SETLIST_FM_API_KEY) {
            const setlists = await retry(() =>
              fetchSetlists(artistData.external_ids.mbid, SETLIST_FM_API_KEY)
            );
            for (const setlist of setlists) {
              const setlistPayload = {
                show_id: showId,
                setlistfm_id: setlist.id,
                event_date: setlist.eventDate,
                venue_id: venueId
              };
              const { data: upsertedSetlist, error: setlistError } = await supabase
                .from("setlists")
                .upsert(setlistPayload, { onConflict: "setlistfm_id" })
                .select();
              if (setlistError) throw setlistError;
              const setlistId = upsertedSetlist?.[0]?.id;

              // 8. Upsert setlist songs
              const setlistSongs = extractSetlistSongs(setlist);
              for (const song of setlistSongs) {
                const setlistSongPayload = {
                  setlist_id: setlistId,
                  name: song.name,
                  encore: song.encore,
                  cover: song.cover
                };
                const { error: setlistSongError } = await supabase
                  .from("setlist_songs")
                  .upsert(setlistSongPayload, { onConflict: "setlist_id" });
                if (setlistSongError) throw setlistSongError;
              }
            }
          }
        }

        results.push({ artistSpotifyId, success: true });
        log("Sync complete", { artistSpotifyId });
      } catch (err) {
        log("Sync failed", { artistSpotifyId, error: err });
        results.push({ artistSpotifyId, success: false, error: err instanceof Error ? err.message : String(err) });
      }
    }

    return new Response(JSON.stringify({
      success: true,
      batch,
      results
    }), { status: 200 });

  } catch (err) {
    let message = "Unknown error";
    if (err instanceof Error) {
      message = err.message;
    }
    log("Fatal sync error", { error: message });
    return new Response(JSON.stringify({ error: message }), { status: 500 });
  }
});
