import { createClient } from '@supabase/supabase-js';
import { retryableFetch } from '../../../lib/retry';
import { saveArtistToDatabase, saveShowToDatabase, saveVenueToDatabase } from '../../../lib/api/database-utils';

// Create Supabase admin client with error handling
let supabase;
try {
  supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
  
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Missing Supabase environment variables');
  }
} catch (error) {
  console.error('Error initializing Supabase client:', error);
  // Fallback client
  supabase = {
    from: () => ({
      insert: () => ({ error: { message: 'Supabase client initialization failed' } })
    })
  };
}

/**
 * Fetch all upcoming shows at a venue from Ticketmaster API
 */
export async function fetchVenueShows(venueId: string) {
  try {
    const apiKey = process.env.TICKETMASTER_API_KEY;
    if (!apiKey) throw new Error('Missing Ticketmaster API key');
    
    console.log(`Fetching all upcoming shows for venue ID: ${venueId}`);
    
    // Fetch events at this venue from Ticketmaster
    const response = await fetch(
      `https://app.ticketmaster.com/discovery/v2/events.json?apikey=${apiKey}&venueId=${venueId}&classificationName=music&size=100`,
      {
        headers: {
          'Accept': 'application/json'
        }
      }
    );
    
    if (!response.ok) {
      throw new Error(`Ticketmaster API error: ${response.status}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching venue shows:', error);
    throw error;
  }
}

/**
 * Process and sync all shows at a venue
 */
export async function syncVenueShows(venueId: string, venueName: string) {
  try {
    console.log(`Starting venue sync for ${venueName} (ID: ${venueId})`);
    
    // Fetch all shows at this venue
    const venueData = await retryableFetch(() => fetchVenueShows(venueId), { retries: 3 });
    
    if (!venueData?._embedded?.events || !Array.isArray(venueData._embedded.events)) {
      console.log(`No events found for venue ${venueName}`);
      return { success: false, message: 'No events found' };
    }
    
    const events = venueData._embedded.events;
    console.log(`Found ${events.length} events at venue ${venueName}`);
    
    // Process each event/show
    const processedShows = [];
    
    for (const event of events) {
      try {
        // Skip if not a music event or missing key data
        if (!event.id || !event.name || !event._embedded?.attractions) {
          continue;
        }
        
        // Get the primary artist for this show
        const primaryArtist = event._embedded.attractions[0];
        if (!primaryArtist || !primaryArtist.id || !primaryArtist.name) {
          continue;
        }
        
        // Save artist to database
        const artist = {
          id: primaryArtist.id,
          name: primaryArtist.name,
          image: primaryArtist.images?.[0]?.url
        };
        
        const savedArtist = await saveArtistToDatabase(artist);
        if (!savedArtist) continue;
        
        // Save venue if needed
        const venue = {
          id: venueId,
          name: venueName,
          city: event._embedded?.venues?.[0]?.city?.name,
          state: event._embedded?.venues?.[0]?.state?.name,
          country: event._embedded?.venues?.[0]?.country?.name
        };
        
        const savedVenue = await saveVenueToDatabase(venue);
        if (!savedVenue) continue;
        
        // Save show
        const show = {
          id: event.id,
          name: event.name,
          date: event.dates?.start?.dateTime,
          ticket_url: event.url,
          image_url: event.images?.[0]?.url,
          artist_id: savedArtist.id,
          venue_id: savedVenue.id,
          artist: savedArtist,
          venue: savedVenue
        };
        
        const savedShow = await saveShowToDatabase(show);
        if (savedShow) {
          processedShows.push(savedShow);
        }
      } catch (eventError) {
        console.error(`Error processing event ${event.id}:`, eventError);
        // Continue with next event
      }
    }
    
    return {
      success: true,
      venue: { id: venueId, name: venueName },
      processedShows: processedShows.length,
      totalShows: events.length
    };
  } catch (error) {
    console.error('Error in syncVenueShows:', error);
    
    // Log the error to the database
    await supabase
      .from('error_logs')
      .insert({
        endpoint: 'venue-sync',
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString()
      });
      
    return { 
      success: false, 
      error: 'Failed to sync venue shows',
      details: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
