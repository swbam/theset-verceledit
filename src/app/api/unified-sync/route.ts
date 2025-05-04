import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { clientConfig, serverConfig, validateServerConfig } from '@/integrations/config';
import { headers } from 'next/headers';
import { getArtistByIdServer, getArtistTopTracksServer } from '@/lib/spotify/server-api'; // Import server-side Spotify functions
import { callTicketmasterApi } from '@/lib/api/ticketmaster-config'; // Import Ticketmaster function

// Validate server config on module load
validateServerConfig();

// Initialize Supabase client with service role for server-side operations
const supabase = createClient(
  clientConfig.supabase.url,
  serverConfig.supabase.serviceKey
);

// Add CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

/**
 * Unified API endpoint for syncing data between Spotify, Ticketmaster, and Setlist.fm
 */
export async function POST(request: NextRequest) {
  try {
    // Handle OPTIONS request for CORS preflight
    if (request.method === 'OPTIONS') {
      return new NextResponse(null, {
        headers: corsHeaders
      });
    }

    // Check authorization header
    const authHeader = headers().get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized - Missing or invalid authorization token' },
        { 
          status: 401,
          headers: corsHeaders 
        }
      );
    }

    const { entityType, entityId, options = {} } = await request.json();
    
    // Validate request body structure
    if (!request.body) {
      return NextResponse.json(
        { 
          error: 'Invalid request format',
          details: 'Request body must be JSON with entityType and entityId'
        },
        { 
          status: 400,
          headers: corsHeaders 
        }
      );
    }

// Validate required parameters
const requiredParams = [
  { name: 'entityType', value: entityType },
  { name: 'entityId', value: entityId }
];

for (const param of requiredParams) {
  if (!param.value) {
    return NextResponse.json(
      { 
        error: 'Missing required parameter',
        details: `'${param.name}' is required`
      },
      { status: 400 }
    );
  }
}

// Validate entity type
const validEntityTypes = ['artist', 'show', 'venue', 'setlist'];
if (!validEntityTypes.includes(entityType)) {
  return NextResponse.json(
    { 
      error: 'Invalid entity type',
      details: `'${entityType}' is not supported. Valid types: ${validEntityTypes.join(', ')}`
    },
    { status: 400 }
  );
}

// Validate entity ID format
if (!/^[a-zA-Z0-9-_]+$/.test(entityId)) {
  return NextResponse.json(
    { 
      error: 'Invalid entity ID format',
      details: 'ID must contain only alphanumeric characters, hyphens and underscores'
    },
    { status: 400 }
  );

    
    // Create a sync task in our database
    const { data: syncTask, error: syncTaskError } = await supabase
      .from('sync_tasks')
      .insert({
        entity_type: entityType,
        entity_id: entityId,
        status: 'in_progress',
        entity_name: options.name || undefined,
        data: options,
      })
      .select()
      .single();
      
    if (syncTaskError) {
      console.error('Error creating sync task:', syncTaskError);
      return NextResponse.json(
        { error: 'Failed to create sync task' },
        { status: 500 }
      );
    }
    
    // Process based on entity type
    let syncResult;
    
    try {
      switch (entityType) {
        case 'artist':
          syncResult = await syncArtist(entityId);
          break;
        case 'show':
          syncResult = await syncShow(entityId);
          break;
        case 'venue':
          syncResult = await syncVenue(entityId);
          break;
        case 'setlist':
          syncResult = await syncSetlist(entityId);
          break;
        default:
          throw new Error(`Unsupported entity type: ${entityType}`);
      }
      
      // Update sync task with success
      await supabase
        .from('sync_tasks')
        .update({
          status: 'completed',
          data: { ...options, result: syncResult },
          completed_at: new Date().toISOString(),
        })
        .eq('id', syncTask.id);
      
      return NextResponse.json({
        success: true,
        entity: { type: entityType, id: entityId },
        result: syncResult,
      }, {
        headers: corsHeaders
      });
      
    } catch (error) {
      console.error(`Error syncing ${entityType} ${entityId}:`, error);
      
      // Update sync task with error
      await supabase
        .from('sync_tasks')
        .update({
          status: 'failed',
          error: error instanceof Error ? error.message : String(error),
          completed_at: new Date().toISOString(),
        })
        .eq('id', syncTask.id);
      
      return NextResponse.json(
        { 
          error: `Failed to sync ${entityType}: ${error instanceof Error ? error.message : 'Unknown error'}` 
        },
        { 
          status: 500,
          headers: corsHeaders
        }
      );
    }
    
  } catch (error) {
    console.error('Unified sync error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * Sync artist data from Spotify, update our database
 */
async function syncArtist(artistId: string) {
  // 1. Get artist from our database
  const { data: artist, error } = await supabase
    .from('artists')
    .select('*')
    .eq('id', artistId)
    .single();

  if (error) throw new Error(`Artist not found: ${error.message}`);

  // Validate Ticketmaster API key
  if (!process.env.TICKETMASTER_API_KEY) {
    throw new Error('Ticketmaster API key is not configured');
  }

  // 2. Sync with Spotify if we have a Spotify ID
  if (artist.spotify_id) {
    // Use direct server-side Spotify API calls
    const spotifyData = await getArtistByIdServer(artist.spotify_id);

    if (spotifyData) {
      // Update artist with Spotify data
      await supabase
        .from('artists')
        .update({
          name: spotifyData.name,
          spotify_id: spotifyData.id,
          // Assuming setlist_fm_id might come from other sources or needs separate handling
          // setlist_fm_id: artist.setlist_fm_id || spotifyData.external_ids?.upc || '',
          followers: spotifyData.followers?.total ?? artist.followers,
          popularity: spotifyData.popularity ?? artist.popularity,
          genres: spotifyData.genres ?? artist.genres,
          spotify_url: spotifyData.external_urls?.spotify ?? artist.spotify_url,
        })
        .eq('id', artistId);
    } else {
      console.warn(`Failed to fetch Spotify data for artist ID: ${artist.spotify_id}`);
    }

    // Sync artist's top tracks using server-side function
    const topTracks = await getArtistTopTracksServer(artist.spotify_id);
    if (topTracks.length > 0) {
      await supabase.from('songs').upsert(
        topTracks.map((track: any) => ({
          name: track.name,
          duration_ms: track.duration_ms,
          popularity: track.popularity,
          preview_url: track.preview_url,
          artist_id: artist.id,
          spotify_id: track.id,
          album_name: track.album?.name,
          album_image_url: track.album?.images?.[0]?.url
        })),
        { onConflict: 'spotify_id', ignoreDuplicates: false } // Ensure updates happen
      );
    } else {
       console.warn(`Failed to fetch or no top tracks found for artist ID: ${artist.spotify_id}`);
    }
  }
  
  // 3. Sync upcoming shows with Ticketmaster using direct library call
  const ticketmasterData = await callTicketmasterApi('events.json', {
    keyword: artist.name,
    size: '10', // Ensure size is a string as per callTicketmasterApi params
    classificationName: 'Music'
  });

  const events = ticketmasterData?._embedded?.events || [];
  
  if (events.length > 0) {
    
    // Process and store each event
    for (const event of events) {
      const venue = event._embedded?.venues?.[0];
      
      if (venue) {
        // Check if venue exists in our database
        let venueId;
        const { data: existingVenue } = await supabase
          .from('venues')
          .select('id')
          .eq('ticketmaster_id', venue.id)
          .maybeSingle();
          
        if (existingVenue) {
          venueId = existingVenue.id;
        } else {
          // Create venue if it doesn't exist
          const { data: newVenue } = await supabase
            .from('venues')
            .insert({
              name: venue.name,
              city: venue.city?.name,
              state: venue.state?.stateCode,
              country: venue.country?.name,
              address: venue.address?.line1,
              postal_code: venue.postalCode,
              ticketmaster_id: venue.id,
              latitude: venue.location?.latitude ? parseFloat(venue.location.latitude) : null,
              longitude: venue.location?.longitude ? parseFloat(venue.location.longitude) : null,
            })
            .select('id')
            .single();
            
          venueId = newVenue?.id;
        }
        
        // Check if show exists in our database
        const { data: existingShow } = await supabase
          .from('shows')
          .select('id')
          .eq('ticketmaster_id', event.id)
          .maybeSingle();
          
        if (!existingShow) {
          // Create show if it doesn't exist
          await supabase
            .from('shows')
            .insert({
              name: event.name,
              artist_id: artistId,
              venue_id: venueId,
              date: event.dates.start.dateTime,
              image_url: event.images?.[0]?.url,
              ticket_url: event.url,
              ticketmaster_id: event.id,
              status: event.dates.status?.code || 'unknown',
            });
        }
      }
    }
  }
  
  // 4. Update sync state
  await supabase
    .from('sync_states')
    .upsert({
      entity_type: 'artist',
      entity_id: artistId,
      last_sync_at: new Date().toISOString(),
      next_sync_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 1 day later
      status: 'completed',
    });
  
  return { message: 'Artist sync complete' };
}

/**
 * Sync show data from Ticketmaster, update our database
 */
async function syncShow(showId: string) {
  // 1. Get show from our database
  const { data: show, error } = await supabase
    .from('shows')
    .select('*, artist:artist_id(*)')
    .eq('id', showId)
    .single();
    
  if (error) throw new Error(`Show not found: ${error.message}`);
  
  // 2. If we have a Ticketmaster ID, get fresh data using direct library call
  if (show.ticketmaster_id) {
    const eventData = await callTicketmasterApi(`events/${show.ticketmaster_id}.json`); // Append .json for specific event endpoint

    if (eventData && !eventData.errors) { // Check if data is valid
      // Update show with fresh data
      await supabase
        .from('shows')
        .update({
          name: eventData.name,
          image_url: eventData.images?.[0]?.url || show.image_url,
          ticket_url: eventData.url || show.ticket_url,
          date: eventData.dates?.start?.dateTime || show.date,
          status: eventData.dates?.status?.code || show.status,
          last_updated: new Date().toISOString(),
        })
        .eq('id', showId);
    }
  }
  
  // 3. Try to find a setlist for this show from Setlist.fm
  if (show.artist?.setlist_fm_id) {
    // This would call the Setlist.fm API to search for setlists by artist and date
    // Due to API limitations, implement this only if you have Setlist.fm API access
    console.log('Would search Setlist.fm for', show.artist.name, 'on', new Date(show.date).toISOString().split('T')[0]);
  }
  
  // 4. Update sync state
  await supabase
    .from('sync_states')
    .upsert({
      entity_type: 'show',
      entity_id: showId,
      last_sync_at: new Date().toISOString(),
      next_sync_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 1 day later
      status: 'completed',
    });
  
  return { message: 'Show sync complete' };
}

/**
 * Sync venue data from Ticketmaster, update our database
 */
async function syncVenue(venueId: string) {
  // 1. Get venue from our database
  const { data: venue, error } = await supabase
    .from('venues')
    .select('*')
    .eq('id', venueId)
    .single();
    
  if (error) throw new Error(`Venue not found: ${error.message}`);
  
  // 2. If we have a Ticketmaster ID, get fresh data using direct library call
  if (venue.ticketmaster_id) {
    const venueData = await callTicketmasterApi(`venues/${venue.ticketmaster_id}.json`); // Append .json for specific venue endpoint

    if (venueData && !venueData.errors) { // Check if data is valid
      // Update venue with fresh data
      await supabase
        .from('venues')
        .update({
          name: venueData.name,
          city: venueData.city?.name || venue.city,
          state: venueData.state?.stateCode || venue.state,
          country: venueData.country?.name || venue.country,
          address: venueData.address?.line1 || venue.address,
          postal_code: venueData.postalCode || venue.postal_code,
          latitude: venueData.location?.latitude ? parseFloat(venueData.location.latitude) : venue.latitude,
          longitude: venueData.location?.longitude ? parseFloat(venueData.location.longitude) : venue.longitude,
          updated_at: new Date().toISOString(),
        })
        .eq('id', venueId);
    }
  }
  
  // 3. Update sync state
  await supabase
    .from('sync_states')
    .upsert({
      entity_type: 'venue',
      entity_id: venueId,
      last_sync_at: new Date().toISOString(),
      next_sync_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days later
      status: 'completed',
    });
  
  return { message: 'Venue sync complete' };
}

/**
 * Sync setlist data from Setlist.fm, update our database
 */
async function syncSetlist(setlistId: string) {
  // 1. Get setlist from our database
  const { data: setlist, error } = await supabase
    .from('setlists')
    .select('*, artist:artist_id(*)')
    .eq('id', setlistId)
    .single();
    
  if (error) throw new Error(`Setlist not found: ${error.message}`);
  
  // 2. If we have a Setlist.fm ID, get fresh data
  if (setlist.setlist_fm_id) {
    // This would call the Setlist.fm API to get the setlist
    // Due to API limitations, implement this only if you have Setlist.fm API access
    console.log('Would fetch Setlist.fm data for', setlist.setlist_fm_id);
    
    // For demonstration, we'll just update the last_updated timestamp
    await supabase
      .from('setlists')
      .update({
        updated_at: new Date().toISOString(),
      })
      .eq('id', setlistId);
  }
  
  // 3. Update sync state
  await supabase
    .from('sync_states')
    .upsert({
      entity_type: 'setlist',
      entity_id: setlistId,
      last_sync_at: new Date().toISOString(),
      next_sync_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days later
      status: 'completed',
    });
  
  return { message: 'Setlist sync complete' };
}