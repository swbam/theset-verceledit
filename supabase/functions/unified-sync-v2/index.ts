import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { fetchSpotifyArtist, fetchSpotifyArtistSongs, fetchTicketmasterShows, extractVenueFromShow } from './api.ts';

interface SyncOptions {
  skipDependencies?: boolean;
  forceRefresh?: boolean;
}

interface SyncRequest {
  entityType: 'artist' | 'show' | 'venue';
  entityId?: string;
  ticketmasterId?: string;
  spotifyId?: string;
  options?: SyncOptions;
}

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const ticketmasterApiKey = Deno.env.get('TICKETMASTER_API_KEY');
const spotifyClientId = Deno.env.get('SPOTIFY_CLIENT_ID');
const spotifyClientSecret = Deno.env.get('SPOTIFY_CLIENT_SECRET');

console.log(`[unified-sync-v2] Env Vars Check:`);
console.log(`  SUPABASE_URL: ${supabaseUrl ? 'Present' : 'MISSING!'}`);
console.log(`  SUPABASE_SERVICE_ROLE_KEY: ${supabaseServiceKey ? 'Present' : 'MISSING!'}`);
console.log(`  TICKETMASTER_API_KEY: ${ticketmasterApiKey ? 'Present' : 'MISSING!'}`);
console.log(`  SPOTIFY_CLIENT_ID: ${spotifyClientId ? 'Present' : 'MISSING!'}`);
console.log(`  SPOTIFY_CLIENT_SECRET: ${spotifyClientSecret ? 'Present' : 'MISSING!'}`);

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('[unified-sync-v2] CRITICAL: Supabase URL or Service Role Key is missing. Function cannot proceed.');
  // Early exit or throw might be appropriate here depending on desired behavior
  // For now, let it proceed to potentially fail later, but log the critical issue.
}

const supabase = createClient(supabaseUrl!, supabaseServiceKey!);

async function syncArtist(
  ticketmasterId: string,
  spotifyId?: string,
  options: SyncOptions = {}
) {
  console.log(`[unified-sync-v2] Syncing artist with Ticketmaster ID: ${ticketmasterId}`);
  
  try {
    // 1. Get the internal Artist UUID based on the Ticketmaster ID
    const { data: artistData, error: artistFetchError } = await supabase
      .from('artists')
      .select('id') // Select the primary UUID key
      .eq('ticketmaster_id', ticketmasterId)
      .single();

    if (artistFetchError || !artistData?.id) {
      console.error(`[unified-sync-v2] Error fetching artist UUID for TM ID ${ticketmasterId}:`, artistFetchError);
      throw new Error(`Could not find artist with Ticketmaster ID ${ticketmasterId} to link shows.`);
    }
    const artistUuid = artistData.id;
    console.log(`[unified-sync-v2] Found artist UUID: ${artistUuid} for TM ID: ${ticketmasterId}`);

    // Update sync status to 'syncing'
    await supabase
      .from('artists')
      .update({
        sync_status: { ticketmaster: 'syncing', spotify: spotifyId ? 'syncing' : 'pending' },
        last_sync: new Date().toISOString()
      })
      .eq('ticketmaster_id', ticketmasterId);

    // Fetch shows from Ticketmaster
    const shows = await fetchTicketmasterShows(ticketmasterId, Deno.env.get('TICKETMASTER_API_KEY')!);
    console.log(`[unified-sync-v2] Found ${shows.length} shows for artist`);

    // Process each show and its venue
    for (const show of shows) {
      // Extract and upsert venue
      const venue = extractVenueFromShow(show);
      let venueUuid: string | null = null; // Variable to hold the venue's UUID
      if (venue) {
        const { data: upsertedVenue, error: venueError } = await supabase
          .from('venues')
          .upsert({
            // Map tm_venue_id from API to ticketmaster_id in DB
            ticketmaster_id: venue.tm_venue_id,
            name: venue.name,
            city: venue.city,
            state: venue.state,
            country: venue.country,
            address: venue.address,
            postal_code: venue.postal_code,
            latitude: venue.latitude,
            longitude: venue.longitude,
            url: venue.url,
            image_url: venue.image_url,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'ticketmaster_id' // Use the correct constraint name
          })
          .select('id') // Select the primary UUID key after upsert
          .single();

        if (venueError) {
          console.error(`[unified-sync-v2] Error upserting venue (TM ID: ${venue.tm_venue_id}):`, venueError);
          // Continue to next show if venue fails
        } else if (upsertedVenue?.id) {
           venueUuid = upsertedVenue.id; // Store the venue's primary UUID
           console.log(`[unified-sync-v2] Upserted venue ${venue.name}, got UUID: ${venueUuid}`);
        } else {
           console.warn(`[unified-sync-v2] Venue upsert for ${venue.name} did not return an ID.`);
        }
      }

      // Upsert show, linking via UUIDs
      const { error: showError } = await supabase
        .from('shows')
        .upsert({
          ticketmaster_id: show.id,
          name: show.name,
          date: show.dates?.start?.dateTime || show.dates?.start?.localDate,
          image_url: show.images?.[0]?.url,
          ticket_url: show.url,
          url: show.url,
          status: show.dates?.status?.code,
          artist_id: artistUuid, // Use the fetched artist UUID
          venue_id: venueUuid, // Use the fetched venue UUID (can be null)
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'ticketmaster_id' // Use Ticketmaster ID for conflict resolution
        });

      if (showError) {
        console.error(`[unified-sync-v2] Error upserting show:`, showError);
      }
    }

    // If we have a Spotify ID and it's not being skipped, sync Spotify data
    let spotifyData = null;
    let spotifySongs = null;
    
    if (spotifyId && !options.skipDependencies) {
      // Get Spotify access token
      const tokenResponse = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${btoa(`${Deno.env.get('SPOTIFY_CLIENT_ID')}:${Deno.env.get('SPOTIFY_CLIENT_SECRET')}`)}`,
        },
        body: 'grant_type=client_credentials'
      });

      const { access_token } = await tokenResponse.json();

      // Fetch artist data and songs in parallel
      [spotifyData, spotifySongs] = await Promise.all([
        fetchSpotifyArtist(spotifyId, access_token),
        fetchSpotifyArtistSongs(spotifyId, access_token)
      ]);
    }

    // Update artist with all synced data
    const { error: artistError } = await supabase
      .from('artists')
      .update({
        sync_status: {
          ticketmaster: 'success',
          spotify: spotifyData ? 'success' : 'pending'
        },
        upcoming_shows_count: shows.length,
        name: spotifyData?.name,
        image_url: spotifyData?.images?.[0]?.url,
        spotify_url: spotifyData?.external_urls?.spotify,
        genres: spotifyData?.genres,
        popularity: spotifyData?.popularity,
        followers: spotifyData?.followers?.total,
        stored_songs: spotifySongs ? spotifySongs.map(song => ({
          id: song.id,
          name: song.name,
          duration_ms: song.duration_ms,
          popularity: song.popularity
        })) : undefined,
        last_sync: new Date().toISOString(),
        last_spotify_sync: spotifyData ? new Date().toISOString() : undefined,
        last_ticketmaster_sync: new Date().toISOString()
      })
      .eq('ticketmaster_id', ticketmasterId);

    if (artistError) {
      console.error(`[unified-sync-v2] Error updating artist:`, artistError);
      throw artistError;
    }

    return { 
      success: true,
      showsCount: shows.length,
      songsCount: spotifySongs?.length || 0
    };
  } catch (err) {
    console.error(`[unified-sync-v2] Error syncing artist:`, err);
    
    const error = err as Error;
    
    // Update sync status to error
    await supabase
      .from('artists')
      .update({
        sync_status: { 
          ticketmaster: 'error',
          spotify: spotifyId ? 'error' : 'pending'
        },
        last_sync_error: error.message || 'Unknown error occurred'
      })
      .eq('ticketmaster_id', ticketmasterId);

    throw new Error(`Artist sync failed: ${error.message || 'Unknown error occurred'}`);
  }
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
  const requestData = await req.json() as SyncRequest;
  const { entityType, entityId, spotifyId, options = {} } = requestData;
  let tmId = requestData.ticketmasterId;

  if (entityType !== 'artist') {
    throw new Error('Only artist sync is currently supported');
  }

  if (!entityId && !tmId) {
    throw new Error('Either entityId or ticketmasterId is required');
  }

  // If we have an entityId but no ticketmasterId, fetch it from the database
  if (entityId && !tmId) {
    const { data: artist, error: fetchError } = await supabase
      .from('artists')
      .select('ticketmaster_id')
      .eq('id', entityId)
      .single();

    if (fetchError) {
      throw new Error(`Failed to fetch artist: ${fetchError.message}`);
    }

    if (!artist?.ticketmaster_id) {
      throw new Error('Artist has no Ticketmaster ID');
    }

    tmId = artist.ticketmaster_id;
  }

  if (!tmId) {
    throw new Error('Could not determine Ticketmaster ID');
  }

  console.log(`[unified-sync-v2] Starting sync for artist with Ticketmaster ID: ${tmId}`);
  const result = await syncArtist(tmId, spotifyId, options);
  console.log(`[unified-sync-v2] Sync completed successfully:`, result);

    return new Response(
      JSON.stringify(result),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    );
  } catch (err) {
    const error = err as Error;
    console.error('Error in unified-sync-v2:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Unknown error occurred' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    );
  }
});
