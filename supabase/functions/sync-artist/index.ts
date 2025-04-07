/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
// Note: APIClientManager logic is replaced with direct fetch calls below
// import { APIClientManager } from '../../src/lib/sync/api-client.ts'; 

// Define expected request body structure
interface SyncArtistPayload {
  artistId: string;
  // Add other options if needed, e.g., force sync
  // force?: boolean;
}

// Define the structure of your Artist data (align with your DB schema and types)
// You might want to import this from a shared types file if available server-side
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
  // Add any other relevant fields
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


/**
 * Fetch artist data from Ticketmaster and Spotify
 */
async function fetchAndTransformArtistData(supabaseAdmin: any, artistId: string): Promise<Artist | null> {
  console.log(`Fetching data for artist ${artistId}`);
  let artist: Artist | null = null;

  // --- Get Existing Artist Data (Optional but good for preserving fields) ---
  try {
    const { data: existingArtist, error: existingError } = await supabaseAdmin
      .from('artists')
      .select('*')
      .eq('id', artistId)
      .maybeSingle(); // Use maybeSingle to handle not found case gracefully

    if (existingError) {
      console.warn(`Error fetching existing artist ${artistId}:`, existingError.message);
      // Continue even if fetching existing fails
    }
    if (existingArtist) {
      console.log(`Found existing data for artist ${artistId}`);
      artist = existingArtist as Artist;
    }
  } catch (e) {
     // Type check the caught error
     const errorMsg = e instanceof Error ? e.message : String(e);
     console.warn(`Exception fetching existing artist ${artistId}:`, errorMsg);
  }

  // --- Ticketmaster API ---
  const tmApiKey = Deno.env.get('TICKETMASTER_API_KEY');
  if (!tmApiKey) {
    console.error('TICKETMASTER_API_KEY not set in environment variables.');
    // Decide if you want to fail or continue without TM data
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
        // Combine with existing or create new artist object
        if (artist) {
          // Update existing artist
          artist.name = tmData.name;
          artist.image_url = getBestImage(tmData.images) || artist.image_url || null;
          artist.url = tmData.url || artist.url || null;
          artist.updated_at = new Date().toISOString();
        } else {
          // Create new artist structure from TM data
          artist = {
            id: artistId,
            name: tmData.name,
            image_url: getBestImage(tmData.images) || null,
            url: tmData.url || null,
            spotify_id: null, // Initialize optional fields
            spotify_url: null,
            genres: [],
            popularity: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
        }
      }
    } catch (tmError) {
      // Type check the caught error
      const errorMsg = tmError instanceof Error ? tmError.message : String(tmError);
      console.error(`Error fetching or processing Ticketmaster data for artist ${artistId}:`, errorMsg);
    }
  }

  // --- Spotify API ---
  if (artist && artist.name) { // Only search Spotify if we have an artist name
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
            // Enrich the artist object
            artist.spotify_id = spotifyArtist.id;
            artist.spotify_url = spotifyArtist.external_urls?.spotify || null;
            artist.genres = spotifyArtist.genres || artist.genres || []; // Merge or overwrite genres? Overwriting here.
            artist.popularity = spotifyArtist.popularity ?? artist.popularity ?? null; // Prioritize Spotify popularity

            // Use Spotify image only if TM didn't provide one
            if (!artist.image_url && spotifyArtist.images?.length > 0) {
              artist.image_url = spotifyArtist.images[0].url;
            }
            artist.updated_at = new Date().toISOString(); // Update timestamp again
          } else {
             console.log(`No Spotify artist found for query: ${artist.name}`);
          }
        }
      } catch (spotifyError) {
        // Type check the caught error
        const errorMsg = spotifyError instanceof Error ? spotifyError.message : String(spotifyError);
        console.error(`Error fetching or processing Spotify data for artist ${artist.name}:`, errorMsg);
      }
    } else {
       console.warn(`Skipping Spotify enrichment for ${artist.name} due to missing token.`);
    }
  } else if (!artist) {
      console.warn(`Skipping Spotify enrichment because no base artist data could be fetched for ID ${artistId}.`);
  } else if (!artist.name) {
      console.warn(`Skipping Spotify enrichment for artist ID ${artistId} because artist name is missing.`);
  }


  if (!artist?.name) {
    console.error(`Failed to resolve artist name for ID ${artistId} from any source.`);
    return null; // Cannot proceed without a name
  }

  return artist;
}
// --- Helper function from original service ---
/**
 * Get the best quality image from an array of images
 */
function getBestImage(images?: Array<{url: string, width: number, height: number}>): string | null {
  if (!images || images.length === 0) return null;
  // Sort by width to get highest resolution
  const sorted = [...images].sort((a, b) => (b.width || 0) - (a.width || 0));
  return sorted[0].url;
}
// --- End Helper ---

serve(async (req: Request) => { // Add type Request for req parameter
  console.log('--- sync-artist function handler started ---'); // Add log right at the beginning
  // Handle CORS preflight request
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

    // Initialize Supabase client with SERVICE_ROLE key
    // Ensure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in Edge Function env vars
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Fetch and transform data using migrated logic, passing admin client
    const artistData = await fetchAndTransformArtistData(supabaseAdmin, artistId);

    if (!artistData) {
      console.error(`Failed to fetch or transform data for artist ${artistId}`);
      return new Response(JSON.stringify({ error: 'Failed to fetch artist data from external APIs' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500, // Or appropriate error code
      })
    }

    // Upsert data into Supabase using the admin client (bypasses RLS)
    console.log(`Upserting artist ${artistId} into database...`);
    const { data: upsertedData, error: upsertError } = await supabaseAdmin
      .from('artists') // Ensure 'artists' is your table name
      .upsert(artistData, { onConflict: 'id' }) // Assuming 'id' is the conflict target
      .select() // Optionally select the upserted data to return
      .single(); // Assuming upsert returns a single row

    if (upsertError) {
      console.error('Supabase upsert error:', upsertError);
      return new Response(JSON.stringify({ error: 'Database error during upsert', details: upsertError.message }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      })
    }

    console.log(`Successfully synced artist ${artistId}`);
    // Optionally, update sync status (if you migrate IncrementalSyncService logic too)
    // await updateSyncStatus(supabaseAdmin, artistId, 'artist');

    return new Response(JSON.stringify({ success: true, data: upsertedData }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    // Ensure error is an instance of Error before accessing message
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('Unhandled error:', errorMessage, error); // Log the full error too
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})

// TODO: Consider migrating IncrementalSyncService logic here or to another function
// async function updateSyncStatus(client: any, id: string, type: string) { ... }