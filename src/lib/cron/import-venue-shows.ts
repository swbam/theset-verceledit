import { supabase } from '@/lib/supabase';
import { callTicketmasterApi } from '@/lib/api/ticketmaster-config';
import { saveArtistToDatabase } from '@/lib/api/db/artist-utils';
import { saveVenueToDatabase } from '@/lib/api/db/venue-utils';
import { saveShowToDatabase } from '@/lib/api/database-utils';
import { logJobRun } from '@/lib/api/db/job-logs';

/**
 * Fetch top venues from Ticketmaster based on popular music events
 * @param limit Number of venues to fetch
 * @returns Array of venue IDs
 */
async function fetchTopVenues(limit: number = 10): Promise<string[]> {
  try {
    // Use the event search endpoint with parameters to focus on music events in the US, sorted by popularity
    const params = {
      countryCode: 'US',
      classificationName: 'music',
      sort: 'popularity,desc',
      size: (limit * 2).toString(), // Fetch more events to ensure we get enough unique venues
    };
    
    console.log('Fetching top venues from Ticketmaster...');
    const data = await callTicketmasterApi('events.json', params);
    
    if (!data._embedded?.events || data._embedded.events.length === 0) {
      console.log('No events found');
      return [];
    }
    
    // Extract unique venues from the events
    const venueMap = new Map<string, any>();
    
    for (const event of data._embedded.events) {
      if (event._embedded?.venues && event._embedded.venues.length > 0) {
        const venue = event._embedded.venues[0];
        if (venue.id && !venueMap.has(venue.id)) {
          venueMap.set(venue.id, venue);
        }
      }
    }
    
    // Convert to array and limit to requested number
    const venueIds = Array.from(venueMap.keys()).slice(0, limit);
    console.log(`Found ${venueIds.length} unique top venues`);
    
    // Save venues to database
    for (const venueId of venueIds) {
      const venue = venueMap.get(venueId);
      await saveVenueToDatabase({
        id: venue.id,
        name: venue.name,
        city: venue.city?.name,
        state: venue.state?.name,
        country: venue.country?.name,
        address: venue.address?.line1,
        postal_code: venue.postalCode,
        location: venue.location ? {
          latitude: venue.location.latitude,
          longitude: venue.location.longitude
        } : null
      });
    }
    
    return venueIds;
  } catch (error) {
    console.error('Error fetching top venues:', error);
    return [];
  }
}

/**
 * Fetch upcoming shows for a specific venue
 * @param venueId Ticketmaster venue ID
 * @param limit Number of shows to fetch per venue
 * @returns Array of processed shows
 */
async function fetchShowsForVenue(venueId: string, limit: number = 10) {
  try {
    const params = {
      venueId,
      size: limit.toString(),
      sort: 'date,asc',
      classificationName: 'music',
      startDateTime: new Date().toISOString().slice(0, 19) + 'Z'
    };
    
    console.log(`Fetching upcoming shows for venue ${venueId}...`);
    const data = await callTicketmasterApi('events.json', params);
    
    if (!data._embedded?.events || data._embedded.events.length === 0) {
      console.log(`No upcoming shows found for venue ${venueId}`);
      return [];
    }
    
    console.log(`Found ${data._embedded.events.length} shows for venue ${venueId}`);
    return data._embedded.events;
  } catch (error) {
    console.error(`Error fetching shows for venue ${venueId}:`, error);
    return [];
  }
}

/**
 * Process a single event and save it to the database
 * @param event Ticketmaster event object
 * @returns Processed show object or null if failed
 */
async function processEvent(event: any) {
  try {
    // Process artist
    let artistName = '';
    let artistId = '';
    let artistData = null;
    let genreName = 'Music';
    
    if (event._embedded?.attractions && event._embedded.attractions.length > 0) {
      const attraction = event._embedded.attractions[0];
      artistName = attraction.name;
      artistId = attraction.id;
      
      // Get genre if available
      if (event.classifications && event.classifications[0]) {
        const classification = event.classifications[0];
        genreName = classification.genre?.name || 
                    classification.subGenre?.name || 
                    classification.segment?.name || 
                    'Music';
      }
      
      // Create artist object
      artistData = {
        id: artistId,
        name: artistName,
        image: attraction.images?.find((img: any) => img.ratio === "16_9" && img.width > 500)?.url,
        upcoming_shows: 1,
        genres: [genreName].filter(Boolean)
      };
      
      // Save artist to database
      await saveArtistToDatabase(artistData);
    } else {
      // Fallback to extracting from event name
      artistName = event.name.split(' at ')[0].split(' - ')[0].trim();
      artistId = `tm-${encodeURIComponent(artistName.toLowerCase().replace(/\s+/g, '-'))}`;
      
      // Create minimal artist data
      artistData = {
        id: artistId,
        name: artistName
      };
      
      // Save artist to database
      await saveArtistToDatabase(artistData);
    }
    
    // Process venue
    let venue = null;
    let venueId = null;
    if (event._embedded?.venues?.[0]) {
      const venueData = event._embedded.venues[0];
      venue = {
        id: venueData.id,
        name: venueData.name,
        city: venueData.city?.name,
        state: venueData.state?.name,
        country: venueData.country?.name,
      };
      venueId = venueData.id;
      
      // Save venue to database
      await saveVenueToDatabase(venue);
    }
    
    // Create show object
    const show = {
      id: event.id,
      name: event.name,
      date: event.dates.start.dateTime || event.dates.start.localDate,
      artist_id: artistId,
      venue_id: venueId,
      ticket_url: event.url,
      image_url: event.images.find((img: any) => img.ratio === "16_9" && img.width > 500)?.url,
      genre: genreName,
      artist: artistData,
      venue: venue,
      popularity: Math.floor(Math.random() * 5000) + 1000 // Random popularity for display
    };
    
    // Save show to database
    await saveShowToDatabase(show);
    
    return show;
  } catch (error) {
    console.error(`Error processing event ${event.id}:`, error);
    return null;
  }
}

/**
 * Import shows from top venues
 * This function is meant to be called once per day via a cron job
 * @param venueLimit Number of top venues to fetch
 * @param showsPerVenue Number of shows to fetch per venue
 * @returns Results of the import operation
 */
export async function importShowsFromTopVenues(venueLimit: number = 10, showsPerVenue: number = 5) {
  console.log('Starting import of shows from top venues...');
  const startTime = new Date();
  
  const results = {
    venuesProcessed: 0,
    showsProcessed: 0,
    showsCreated: 0,
    errors: [] as string[],
    startTime: startTime.toISOString(),
    endTime: '',
    duration: 0
  };
  
  try {
    // Step 1: Fetch top venues
    const venueIds = await fetchTopVenues(venueLimit);
    results.venuesProcessed = venueIds.length;
    
    if (venueIds.length === 0) {
      const error = 'No venues found to process';
      results.errors.push(error);
      console.error(error);
      return results;
    }
    
    // Step 2: For each venue, fetch upcoming shows
    for (const venueId of venueIds) {
      try {
        const events = await fetchShowsForVenue(venueId, showsPerVenue);
        results.showsProcessed += events.length;
        
        // Step 3: Process each event and save to database
        for (const event of events) {
          try {
            const show = await processEvent(event);
            if (show) {
              results.showsCreated++;
            }
          } catch (eventError) {
            const errorMsg = `Error processing event for venue ${venueId}: ${eventError instanceof Error ? eventError.message : String(eventError)}`;
            results.errors.push(errorMsg);
            console.error(errorMsg);
          }
        }
      } catch (venueError) {
        const errorMsg = `Error processing venue ${venueId}: ${venueError instanceof Error ? venueError.message : String(venueError)}`;
        results.errors.push(errorMsg);
        console.error(errorMsg);
      }
    }
    
    // Set final timestamps
    const endTime = new Date();
    results.endTime = endTime.toISOString();
    results.duration = endTime.getTime() - startTime.getTime();
    
    // Log the job run
    await logJobRun({
      job_type: 'venue_shows_import',
      items_processed: results.showsProcessed,
      items_created: results.showsCreated,
      errors: results.errors,
      status: results.errors.length === 0 ? 'success' : 'partial',
      metadata: {
        venues_processed: results.venuesProcessed,
        duration_ms: results.duration
      }
    });
    
    console.log(`Venue shows import complete: processed ${results.venuesProcessed} venues, created ${results.showsCreated} shows`);
    return results;
  } catch (error) {
    const errorMsg = `Error in importShowsFromTopVenues: ${error instanceof Error ? error.message : String(error)}`;
    results.errors.push(errorMsg);
    console.error(errorMsg);
    
    // Set final timestamps even in case of error
    const endTime = new Date();
    results.endTime = endTime.toISOString();
    results.duration = endTime.getTime() - startTime.getTime();
    
    // Log the failed job run
    await logJobRun({
      job_type: 'venue_shows_import',
      items_processed: results.showsProcessed,
      items_created: results.showsCreated,
      errors: results.errors,
      status: 'failure',
      metadata: {
        venues_processed: results.venuesProcessed,
        duration_ms: results.duration
      }
    });
    
    return results;
  }
}