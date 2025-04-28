import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Unified API endpoint for syncing data between Spotify, Ticketmaster, and Setlist.fm
 */
export async function POST(request: NextRequest) {
  try {
    const { entityType, entityId, options = {} } = await request.json();
    
    if (!entityType || !entityId) {
      return NextResponse.json(
        { error: 'Missing required parameters: entityType and entityId' },
        { status: 400 }
      );
    }
    
    // Validate entity type
    if (!['artist', 'show', 'venue', 'setlist'].includes(entityType)) {
      return NextResponse.json(
        { error: `Invalid entityType: ${entityType}` },
        { status: 400 }
      );
    }
    
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
        { status: 500 }
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
  
  // 2. Sync with Spotify if we have a Spotify ID
  if (artist.spotify_id) {
    const spotifyResponse = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL}/api/spotify/artist?id=${artist.spotify_id}`, {
        headers: {
          'Authorization': `Bearer ${process.env.VITE_SPOTIFY_CLIENT_SECRET}`
        }
      }
    );

    // Sync artist's top tracks
    const tracksResponse = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL}/api/spotify/artist-top-tracks?id=${artist.spotify_id}`, {
        headers: {
          'Authorization': `Bearer ${process.env.VITE_SPOTIFY_CLIENT_SECRET}`
        }
      }
    );
    const tracksData = await tracksResponse.json();
    await supabase.from('songs').upsert(
      tracksData.tracks.map((track: any) => ({
        name: track.name,
        duration_ms: track.duration_ms,
        popularity: track.popularity,
        preview_url: track.preview_url,
        artist_id: artist.id,
        spotify_id: track.id,
        album_name: track.album?.name,
        album_image_url: track.album?.images?.[0]?.url
      })),
      { onConflict: 'spotify_id' }
    );
    
    if (!spotifyResponse.ok) {
      console.warn('Failed to sync with Spotify:', await spotifyResponse.text());
    } else {
      const spotifyData = await spotifyResponse.json();
      
      // Update artist with Spotify data
      await supabase
        .from('artists')
        .update({
          name: spotifyData.name,
          spotify_id: spotifyData.id,
          setlist_fm_id: artist.setlist_fm_id || spotifyData.external_ids?.upc || '',
          followers: spotifyData.followers?.total || artist.followers,
          popularity: spotifyData.popularity || artist.popularity,
          genres: spotifyData.genres || artist.genres,
          spotify_url: spotifyData.external_urls?.spotify || artist.spotify_url,
        })
        .eq('id', artistId);
    }
  }
  
  // 3. Sync upcoming shows with Ticketmaster
  const ticketmasterResponse = await fetch(
    `${process.env.NEXT_PUBLIC_APP_URL}/api/ticketmaster?endpoint=events.json&keyword=${encodeURIComponent(artist.name)}&size=10&classificationName=Music`, {
      headers: {
        'x-api-key': process.env.VITE_TICKETMASTER_API_KEY || process.env.NEXT_PUBLIC_TICKETMASTER_API_KEY
      }
    }
  );
  
  if (ticketmasterResponse.ok) {
    const ticketmasterData = await ticketmasterResponse.json();
    const events = ticketmasterData._embedded?.events || [];
    
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
  
  // 2. If we have a Ticketmaster ID, get fresh data
  if (show.ticketmaster_id) {
    const ticketmasterResponse = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL}/api/ticketmaster?endpoint=events/${show.ticketmaster_id}`
    );
    
    if (ticketmasterResponse.ok) {
      const eventData = await ticketmasterResponse.json();
      
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
  
  // 2. If we have a Ticketmaster ID, get fresh data
  if (venue.ticketmaster_id) {
    const ticketmasterResponse = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL}/api/ticketmaster?endpoint=venues/${venue.ticketmaster_id}`
    );
    
    if (ticketmasterResponse.ok) {
      const venueData = await ticketmasterResponse.json();
      
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