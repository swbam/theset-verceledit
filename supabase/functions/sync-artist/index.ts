/// <reference types="https://deno.land/x/supabase@1.3.1/mod.ts" />
/// <reference types="https://deno.land/x/xhr@0.1.0/mod.ts" />
/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { retry } from '../_shared/retryUtils.ts'
import { handleError, ErrorSource } from '../_shared/errorUtils.ts'
import { Artist, ApiResponse, Deno } from '../_shared/types.ts'

// Helper to get Spotify Access Token (Client Credentials Flow)
async function getSpotifyToken(): Promise<string | null> {
  try {
    const clientId = Deno.env.get('SPOTIFY_CLIENT_ID');
    const clientSecret = Deno.env.get('SPOTIFY_CLIENT_SECRET');

    if (!clientId || !clientSecret) {
      handleError({
        message: 'Spotify client ID or secret not configured',
        source: ErrorSource.Spotify,
        context: { hasClientId: !!clientId, hasClientSecret: !!clientSecret }
      });
      return null;
    }

    const response = await retry(
      async () => {
        const res = await fetch('https://accounts.spotify.com/api/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': 'Basic ' + btoa(clientId + ':' + clientSecret)
          },
          body: 'grant_type=client_credentials'
        });

        if (!res.ok) {
          throw new Error(`Failed to get Spotify token: ${res.statusText}`);
        }

        return res;
      },
      {
        retries: 3,
        minTimeout: 1000,
        maxTimeout: 5000,
        onRetry: (error, attempt) => {
          console.warn(`[getSpotifyToken] Retry attempt ${attempt}:`, error);
        }
      }
    );

    const data = await response.json();
    return data.access_token;
  } catch (error) {
    handleError({
      message: 'Failed to get Spotify access token',
      source: ErrorSource.Spotify,
      originalError: error
    });
    return null;
  }
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
  try {
    const apiKey = Deno.env.get('SETLIST_FM_API_KEY');
    if (!apiKey) {
      handleError({
        message: 'Setlist.fm API key not configured',
        source: ErrorSource.Setlist,
      });
      return null;
    }

    const response = await retry(
      async () => {
        const res = await fetch(
          `https://api.setlist.fm/rest/1.0/search/artists?artistName=${encodeURIComponent(artistName)}&sort=relevance`,
          {
            headers: {
              'x-api-key': apiKey,
              'Accept': 'application/json'
            }
          }
        );

        if (!res.ok) {
          throw new Error(`Failed to search Setlist.fm: ${res.statusText}`);
        }

        return res;
      },
      {
        retries: 3,
        minTimeout: 1000,
        maxTimeout: 5000,
        onRetry: (error, attempt) => {
          console.warn(`[searchSetlistFmArtist] Retry attempt ${attempt} for ${artistName}:`, error);
        }
      }
    );

    const data: SetlistFmSearchResponse = await response.json();
    return data.artist?.[0]?.mbid ?? null;
  } catch (error) {
    handleError({
      message: `Failed to search for artist on Setlist.fm`,
      source: ErrorSource.Setlist,
      originalError: error,
      context: { artistName }
    });
    return null;
  }
}

async function fetchAndTransformArtistData(supabaseAdmin: any, artistId: string): Promise<Artist | null> {
  console.log(`Fetching data for artist ${artistId}`);
  let artist: Artist | null = null;

  try {
    // Try to find by ticketmaster_id first
    const { data: existingArtist, error: existingError } = await supabaseAdmin
      .from('artists')
      .select('*')
      .eq('id', artistId)
      .single();

    if (existingError) {
      console.warn(`Error fetching existing artist with id ${artistId}:`, existingError.message);
    }
    
    if (existingArtist) {
      console.log(`Found existing data for artist with id ${artistId}`);
      artist = existingArtist as Artist;
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
            artist.image_url = getBestImage(tmData.images) || artist.image_url || undefined;
            artist.url = tmData.url || artist.url || undefined;
            artist.updated_at = new Date().toISOString();
          } else {
            artist = {
              external_id: null,
              name: tmData.name,
              image_url: getBestImage(tmData.images) || null,
              url: tmData.url || null,
              spotify_id: null,
              spotify_url: null,
              genres: [],
              popularity: null,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              setlist_fm_mbid: null,
              setlist_fm_id: null,
              ticketmaster_id: artistId,
              followers: null,
              tm_id: artistId,
              stored_tracks: null
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
              const spotifyArtistData = transformSpotifyArtist(spotifyArtist);
              artist = { ...artist, ...spotifyArtistData };
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
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`Error in fetchAndTransformArtistData: ${errorMsg}`);
    return null;
  }
}

async function transformSpotifyArtist(spotifyData: any): Promise<Partial<Artist>> {
  return {
    name: spotifyData.name,
    external_id: spotifyData.id || undefined,
    image_url: spotifyData.images?.[0]?.url || undefined,
    url: spotifyData.external_urls?.spotify || undefined,
    spotify_id: spotifyData.id || undefined,
    spotify_url: spotifyData.external_urls?.spotify || undefined,
    genres: spotifyData.genres || [],
    popularity: spotifyData.popularity || undefined,
    followers: spotifyData.followers?.total || undefined,
    updated_at: new Date().toISOString()
  };
}

function getBestImage(images?: Array<{url: string, width: number, height: number}>): string | undefined {
  if (!images || images.length === 0) return undefined;
  const sorted = [...images].sort((a, b) => (b.width || 0) - (a.width || 0));
  return sorted[0].url;
}

// Update sync state in database
async function updateSyncStatus(client: any, entityId: string, entityType: string) {
  try {
    const now = new Date().toISOString();
    const { error } = await client
      .from('sync_states')
      .upsert({
        entity_id: entityId,
        entity_type: entityType,
        external_id: null,
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
    const { artistId } = await req.json();

    if (!artistId) {
      return new Response(
        JSON.stringify({ error: 'Artist ID is required' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    console.log(`Sync request received for artist: ${artistId}`);

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const artistData = await retry(
      async () => {
        const data = await fetchAndTransformArtistData(supabaseAdmin, artistId);
        if (!data) {
          throw new Error('Failed to fetch or transform artist data');
        }
        return data;
      },
      {
        retries: 3,
        minTimeout: 1000,
        maxTimeout: 5000,
        onRetry: (error, attempt) => {
          console.warn(`[fetchAndTransformArtistData] Retry attempt ${attempt} for ${artistId}:`, error);
        }
      }
    );

    console.log(`Upserting artist ${artistId} into database...`);
    const dataForUpsert = artistData;

    const { error } = await supabaseAdmin
      .from('artists')
      .upsert(dataForUpsert);

    if (error) {
      handleError({
        message: 'Failed to upsert artist data',
        source: ErrorSource.Supabase,
        originalError: error,
        context: { artistId }
      });
      throw error;
    }

    // Added: Update sync state after successful upsert
    await updateSyncStatus(supabaseAdmin, artistId, 'artist');

    console.log(`Successfully synced artist ${artistId}`);

    const response: ApiResponse<Artist> = {
      success: true,
      data: artistData
    };

    return new Response(
      JSON.stringify(response), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    handleError({
      message: 'Unhandled error in sync-artist function',
      source: ErrorSource.API,
      originalError: error,
      context: { endpoint: 'sync-artist' }
    });

    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});