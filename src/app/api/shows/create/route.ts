// Use standard Response object for non-Next.js environments
import { supabase } from '../../../../lib/db'; // Use server-side client
import { saveShowToDatabase } from '../../../../lib/api/database-utils';
import { syncVenueShows } from '../../../../lib/api/shows';
// Import specific types needed
import { Show, Artist } from '../../../../lib/types'; // Removed Venue import

// Define Venue structure based on Show type (since Venue type isn't exported)
interface VenueData {
  id: string;
  name: string;
  city?: string;
  state?: string;
  country?: string;
}

// Define custom type for the show creation payload
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

/**
 * POST /api/shows/create
 * Creates a new show in the database based on user input.
 * This triggers saving related artist/venue and setlist creation.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json() as ShowCreate;

    // Validate required fields
    if (!body.date || !body.artist?.id || !body.artist?.name || !body.venue?.id || !body.venue?.name) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Check if show exists already to avoid duplicates
    const { data: existingShows, error: checkError } = await supabase
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

    // Prepare the show object to save
    const showToSave = {
      // Use provided Ticketmaster ID or generate a UUID if manual
      id: body.ticketmaster_id || crypto.randomUUID(),
      name: body.name || `${body.artist.name} Concert`,
      date: new Date(body.date).toISOString(),
      artist_id: body.artist.id,
      venue_id: body.venue.id,
      external_url: body.external_url,
      image_url: body.image_url,
      
      // Construct venue object - generate ID if needed, rely on saveVenueToDatabase
      venue: {
        id: body.venue.id,
        name: body.venue.name,
        city: body.venue.city,
        state: body.venue.state,
        country: body.venue.country || 'USA',
      },
      // Pass the full artist object (ensure name is present as required by internal type)
      artist: body.artist
    };

    console.log('API Route: Attempting to save show:', showToSave);

    // Call the core save function which handles all related sync logic
    // Cast is still needed because the imported Show type might slightly differ from the internal one
    const savedShow = await saveShowToDatabase(showToSave as Show);

    if (!savedShow) {
      console.error('API Route: Failed to save show using saveShowToDatabase');
      // Use standard Response
      return new Response(JSON.stringify({ error: 'Failed to save show to database' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    console.log('API Route: Show saved successfully:', savedShow);
    // Trigger background sync for the venue (fire-and-forget)
    if (savedShow.venue_id) {
      console.log(`API Route: Triggering venue sync for venue ID: ${savedShow.venue_id}`);
      syncVenueShows(savedShow.venue_id).catch(syncError => {
        console.error(`API Route: Background venue sync failed for ${savedShow.venue_id}:`, syncError);
      });
    } else {
      console.warn(`API Route: Cannot trigger venue sync, venue_id missing for show ${savedShow.id}`);
    }


    // Use standard Response
    return new Response(JSON.stringify({ success: true, show: savedShow }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    let errorMessage = "Unknown error";
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    console.error("Error in POST /api/shows/create:", error);
    // Use standard Response
    return new Response(JSON.stringify({ error: "Server error creating show", details: errorMessage }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}