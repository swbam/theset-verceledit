import { adminClient } from '@/lib/db';
import { supabase } from '@/integrations/supabase/client';
import type { Show, Artist } from '@/lib/types';

interface VenueData {
  id: string;
  name: string;
  city?: string;
  state?: string;
  country?: string;
}

interface ShowCreate {
  id?: string;
  ticketmaster_id?: string;
  name?: string;
  date: string;
  time?: string;
  artist: Artist;
  venue: VenueData;
  external_url?: string;
  image_url?: string;
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as ShowCreate;

    // Validate required fields
    if (!body.date || !body.artist?.id || !body.artist?.name || !body.venue?.id || !body.venue?.name) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Check if show exists already to avoid duplicates
    const { data: existingShows, error: checkError } = await adminClient
      .from('shows')
      .select('id')
      .eq('date', new Date(body.date).toISOString())
      .eq('artist_id', body.artist.id)
      .eq('venue_id', body.venue.id);

    if (checkError) {
      console.error('Error checking for existing show:', checkError);
      return Response.json({ error: 'Database error' }, { status: 500 });
    }

    // If show exists, return the first match
    if (existingShows && existingShows.length > 0) {
      return Response.json({ 
        id: existingShows[0].id,
        message: 'Show already exists'
      }, { status: 200 });
    }

    // Prepare the show object
    const showToSave = {
      id: body.ticketmaster_id || crypto.randomUUID(),
      name: body.name || `${body.artist.name} Concert`,
      date: new Date(body.date).toISOString(),
      artist_id: body.artist.id,
      venue_id: body.venue.id,
      external_url: body.external_url,
      image_url: body.image_url,
      venue: {
        id: body.venue.id,
        name: body.venue.name,
        city: body.venue.city,
        state: body.venue.state,
        country: body.venue.country || 'USA',
      },
      artist: body.artist
    };

    console.log('API Route: Starting sync for show:', showToSave);

    // 1. Sync Artist
    console.log(`[API/shows/create] Syncing artist ${showToSave.artist_id}`);
    const artistResult = await supabase.functions.invoke('sync-artist', {
      body: { artistId: showToSave.artist_id }
    });

    if (!artistResult.data?.success) {
      console.error(`[API/shows/create] Artist sync failed:`, artistResult.error);
    }

    // 2. Sync Venue
    console.log(`[API/shows/create] Syncing venue ${showToSave.venue_id}`);
    const venueResult = await supabase.functions.invoke('sync-venue', {
      body: { venueId: showToSave.venue_id }
    });

    if (!venueResult.data?.success) {
      console.error(`[API/shows/create] Venue sync failed:`, venueResult.error);
    }

    // 3. Sync Show
    console.log(`[API/shows/create] Syncing show ${showToSave.id}`);
    const showResult = await supabase.functions.invoke('sync-show', {
      body: { 
        showId: showToSave.id,
        payload: showToSave
      }
    });

    if (!showResult.data?.success) {
      throw new Error(showResult.error?.message || 'Show sync failed');
    }

    console.log(`[API/shows/create] Successfully synced show ${showToSave.id}`);

    return new Response(JSON.stringify({ 
      success: true, 
      message: `Show ${showToSave.id} synced successfully`,
      showData: showToSave
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    let errorMessage = "Unknown error";
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    console.error("Error in POST /api/shows/create:", error);
    return new Response(JSON.stringify({ 
      error: "Server error creating show", 
      details: errorMessage 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
