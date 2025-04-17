/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

// Define expected request body structure
interface SyncArtistPayload {
  artistId: string;
  force?: boolean;
}

interface Artist {
  id: string;
  name: string;
  image_url?: string | null;
  url?: string | null;
  spotify_id?: string | null;
  spotify_url?: string | null;
  genres?: string[];
  popularity?: number | null;
  created_at?: string;
  updated_at?: string;
  setlist_fm_mbid?: string | null;
}

// Helper to get Spotify Access Token (Client Credentials Flow)
async function getSpotifyToken(): Promise<string | null> {
  const clientId = Deno.env.get('SPOTIFY_CLIENT_ID');
  const clientSecret = Deno.env.get('SPOTIFY_CLIENT_SECRET');

  if (!clientId || !clientSecret) {
    console.error('Spotify client ID or secret not configured in environment variables.');
    return null;
  }

  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': 'Basic ' + btoa(clientId + ':' + clientSecret)
    },
    body: 'grant_type=client_credentials'
  });

  if (!response.ok) {
    console.error('Failed to get Spotify token:', response.status, await response.text());
    return null;
  }

  const data = await response.json();
  return data.access_token;
}

// --- Setlist.fm API Helper ---
interface SetlistFmArtist {
  mbid: string;
  name: string;
}

interface SetlistFmSearchResponse {
  artist?: SetlistFmArtist[];
}

async function searchSetlistFmArtist(artistName: string): Promise<string | null> {
  const apiKey = Deno.env.get('SETLIST_FM_API_KEY');
  if (!apiKey) {
    console.warn('SETLIST_FM_API_KEY not set, skipping Setlist.fm search.');
    return null;
  }

  try {
    const searchUrl = `https://api.setlist.fm/rest/1.0/search/artists?artistName=${encodeURIComponent(artistName)}&p=1&sort=relevance`;
    console.log(`Fetching from Setlist.fm: ${searchUrl}`);
    const response = await fetch(searchUrl, {
      headers: {
        'Accept': 'application/json',
        'x-api-key': apiKey,
      },
    });

    if (!response.ok) {
      console.warn(`Setlist.fm API error for ${artistName}: ${response.status} ${await response.text()}`);
      return null;
    }

    const data: SetlistFmSearchResponse = await response.json();
    if (data.artist && data.artist.length > 0) {
      const mbid = data.artist[0].mbid;
      console.log(`Found Setlist.fm MBID for ${artistName}: ${mbid}`);
      return mbid;
    } else {
      console.log(`No Setlist.fm artist found for query: ${artistName}`);
      return null;
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`Error fetching or processing Setlist.fm data for artist ${artistName}:`, errorMsg);
    return null;
  }
}

async function fetchAndTransformArtistData(supabaseAdmin: any, artistId: string): Promise<Artist | null> {
  console.log(`Fetching data for artist ${artistId}`);
  let artist: Artist | null = null;

  try {
    const { data: existingArtist, error: existingError } = await supabaseAdmin
      .from('artists')
      .select('*')
      .eq('id', artistId)
      .maybeSingle();

    if (existingError) {
      console.warn(`Error fetching existing artist ${artistId}:`, existingError.message);
    }
    if (existingArtist) {
      console.log(`Found existing data for artist ${artistId}`);
      artist = existingArtist as Artist;
    }
  } catch (e) {
    const errorMsg = e instanceof Error ? e.message : String(e);
    console.warn(`Exception fetching existing artist ${artistId}:`, errorMsg);
  }

  // --- Ticketmaster API ---
  const tmApiKey = Deno.env.get('TICKETMASTER_API_KEY');
  if (!tmApiKey) {
    console.error('TICKETMASTER_API_KEY not set in environment variables.');
  } else {
    try {
      const tmUrl = `https://app.ticketmaster.com/discovery/v2/attractions/${artistId}.json?apikey=${tmApiKey}`;
      console.log(`Fetching from Ticketmaster: ${tmUrl}`);
      const tmResponse = await fetch(tmUrl);

      if (!tmResponse.ok) {
        console.warn(`Ticketmaster API error for ${artistId}: ${tmResponse.status} ${await tmResponse.text()}`);
      } else {
        const tmData = await tmResponse.json();
        console.log(`Received Ticketmaster data for ${artistId}`);
        if (artist) {
          artist.name = tmData.name;
          artist.image_url = getBestImage(tmData.images) || artist.image_url || null;
          artist.url = tmData.url || artist.url || null;
          artist.updated_at = new Date().toISOString();
        } else {
          artist = {
            id: artistId,
            name: tmData.name,
            image_url: getBestImage(tmData.images) || null,
            url: tmData.url || null,
            spotify_id: null,
            spotify_url: null,
            genres: [],
            popularity: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
        }
      }
    } catch (tmError) {
      const errorMsg = tmError instanceof Error ? tmError.message : String(tmError);
      console.error(`Error fetching or processing Ticketmaster data for artist ${artistId}:`, errorMsg);
    }
  }

  // --- Spotify API ---
  if (artist && artist.name) {
    const spotifyToken = await getSpotifyToken();
    if (spotifyToken) {
      try {
        const searchUrl = `https://api.spotify.com/v1/search?q=${encodeURIComponent(artist.name)}&type=artist&limit=1`;
        console.log(`Fetching from Spotify: ${searchUrl}`);
        const spotifyResponse = await fetch(searchUrl, {
          headers: {
            'Authorization': `Bearer ${spotifyToken}`
          }
        });

        if (!spotifyResponse.ok) {
          console.warn(`Spotify API error for ${artist.name}: ${spotifyResponse.status} ${await spotifyResponse.text()}`);
        } else {
          const spotifyData = await spotifyResponse.json();
          if (spotifyData?.artists?.items?.length > 0) {
            const spotifyArtist = spotifyData.artists.items[0];
            console.log(`Received Spotify data for ${artist.name}`);
            artist.spotify_id = spotifyArtist.id;
            artist.spotify_url = spotifyArtist.external_urls?.spotify || null;
            artist.genres = spotifyArtist.genres || artist.genres || [];
            artist.popularity = spotifyArtist.popularity ?? artist.popularity ?? null;

            if (!artist.image_url && spotifyArtist.images?.length > 0) {
              artist.image_url = spotifyArtist.images[0].url;
            }
            artist.updated_at = new Date().toISOString();
          } else {
            console.log(`No Spotify artist found for query: ${artist.name}`);
          }
        }
      } catch (spotifyError) {
        const errorMsg = spotifyError instanceof Error ? spotifyError.message : String(spotifyError);
        console.error(`Error fetching or processing Spotify data for artist ${artist.name}:`, errorMsg);
      }
    } else {
      console.warn(`Skipping Spotify enrichment for ${artist.name} due to missing token.`);
    }
  }

  // --- Setlist.fm API ---
  if (artist?.name) {
    const mbid = await searchSetlistFmArtist(artist.name);
    if (mbid) {
      artist.setlist_fm_mbid = mbid;
      artist.updated_at = new Date().toISOString();
    }
  }

  if (!artist?.name) {
    console.error(`Failed to resolve artist name for ID ${artistId} from any source.`);
    return null;
  }

  return artist;
}

function getBestImage(images?: Array<{url: string, width: number, height: number}>): string | null {
  if (!images || images.length === 0) return null;
  const sorted = [...images].sort((a, b) => (b.width || 0) - (a.width || 0));
  return sorted[0].url;
}

// Added: Update sync state in database
async function updateSyncStatus(client: any, entityId: string, entityType: string) {
  try {
    const now = new Date().toISOString();
    const { error } = await client
      .from('sync_states')
      .upsert({
        entity_id: entityId,
        entity_type: entityType,
        external_id: entityId,
        last_synced: now,
        sync_version: 1 // Current sync version
      }, {
        onConflict: 'entity_id,entity_type'
      });

    if (error) {
      console.error(`Error updating sync state for ${entityType} ${entityId}:`, error);
    } else {
      console.log(`Updated sync state for ${entityType} ${entityId}`);
    }
  } catch (error) {
    console.error(`Exception updating sync state for ${entityType} ${entityId}:`, error);
  }
}

serve(async (req: Request) => {
  console.log('--- sync-artist function handler started ---');
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const payload: SyncArtistPayload = await req.json();
    const { artistId } = payload;

    if (!artistId) {
      return new Response(JSON.stringify({ error: 'Missing artistId in request body' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    console.log(`Sync request received for artist: ${artistId}`);

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const artistData = await fetchAndTransformArtistData(supabaseAdmin, artistId);

    if (!artistData) {
      console.error(`Failed to fetch or transform data for artist ${artistId}`);
      return new Response(JSON.stringify({ error: 'Failed to fetch artist data from external APIs' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      })
    }

    console.log(`Upserting artist ${artistId} into database...`);
    const { data: upsertedData, error: upsertError } = await supabaseAdmin
      .from('artists')
      .upsert(artistData, { onConflict: 'id' })
      .select()
      .single();

    if (upsertError) {
      console.error('Supabase upsert error:', upsertError);
      return new Response(JSON.stringify({ error: 'Database error during upsert', details: upsertError.message }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      })
    }

    // Added: Update sync state after successful upsert
    await updateSyncStatus(supabaseAdmin, artistId, 'artist');

    console.log(`Successfully synced artist ${artistId}`);

    return new Response(JSON.stringify({ success: true, data: upsertedData }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('Unhandled error:', errorMessage, error);
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})