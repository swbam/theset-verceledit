
import { callTicketmasterApi } from '@/lib/api/ticketmaster-config';
import { saveVenueToDatabase } from '@/lib/api/db/venue-utils';
import { saveArtistToDatabase } from '@/lib/api/db/artist-utils';
import { saveShowToDatabase } from '@/lib/api/database-utils';

/**
 * Import shows from top venues in the US
 * This function:
 * 1. Identifies top venues by looking at popular events
 * 2. For each venue, imports upcoming shows and artists
 * 3. Stores all data in the database
 * 
 * @param venueLimit Number of top venues to process
 * @param showsPerVenueLimit Number of shows to import per venue
 * @returns Results of the import operation
 */
export async function importShowsFromTopVenues(venueLimit = 10, showsPerVenueLimit = 5) {
  console.log(`Starting import from top ${venueLimit} venues, ${showsPerVenueLimit} shows per venue...`);
  
  const results = {
    venuesProcessed: 0,
    venuesCreated: 0,
    showsProcessed: 0,
    showsCreated: 0,
    artistsProcessed: 0,
    artistsCreated: 0,
    errors: [] as string[]
  };

  try {
    // Step 1: Get popular events to identify top venues
    const popularEvents = await fetchPopularEvents(venueLimit * 2); // Fetch more than needed to ensure we get enough valid venues
    
    if (!popularEvents.length) {
      throw new Error('No popular events found to identify top venues');
    }
    
    console.log(`Found ${popularEvents.length} popular events`);
    
    // Step 2: Extract unique venues from popular events
    const uniqueVenues = extractUniqueVenues(popularEvents, venueLimit);
    
    console.log(`Identified ${uniqueVenues.length} unique top venues`);
    results.venuesProcessed = uniqueVenues.length;
    
    // Step 3: For each venue, import shows
    for (const venue of uniqueVenues) {
      try {
        // Save venue to database
        const savedVenue = await saveVenueToDatabase(venue);
        if (savedVenue) {
          results.venuesCreated++;
        }
        
        // Get upcoming shows for this venue
        const venueShows = await fetchVenueEvents(venue.id, showsPerVenueLimit);
        console.log(`Found ${venueShows.length} shows for venue ${venue.name}`);
        
        // Process each show for this venue
        for (const show of venueShows) {
          try {
            results.showsProcessed++;
            
            // Get artist data
            if (show._embedded?.attractions && show._embedded.attractions.length > 0) {
              const attraction = show._embedded.attractions[0];
              
              // Process artist
              results.artistsProcessed++;
              const artistData = {
                id: attraction.id,
                name: attraction.name,
                image_url: attraction.images?.find((img: any) => img.ratio === "16_9" && img.width > 500)?.url,
                upcoming_shows: 1,
                genres: attraction.classifications ? 
                  attraction.classifications.map((c: any) => c.genre?.name).filter(Boolean) : 
                  []
              };
              
              // Save artist to database
              await saveArtistToDatabase(artistData);
              
              // Create show data
              const showData = {
                id: show.id,
                name: show.name,
                date: show.dates.start.dateTime || show.dates.start.localDate,
                artist_id: attraction.id,
                venue_id: venue.id,
                ticket_url: show.url,
                image_url: show.images?.find((img: any) => img.ratio === "16_9" && img.width > 500)?.url,
                artist: artistData,
                venue: venue
              };
              
              // Save show to database
              const showId = await saveShowToDatabase(showData);
              
              if (showId) {
                results.showsCreated++;
              }
            }
          } catch (showError) {
            console.error(`Error processing show ${show.id}:`, showError);
            results.errors.push(`Show processing error: ${showError instanceof Error ? showError.message : String(showError)}`);
          }
        }
      } catch (venueError) {
        console.error(`Error processing venue ${venue.id}:`, venueError);
        results.errors.push(`Venue processing error: ${venueError instanceof Error ? venueError.message : String(venueError)}`);
      }
    }
    
    console.log(`Import complete. Processed ${results.venuesProcessed} venues, created ${results.showsCreated} shows`);
    return results;
  } catch (error) {
    console.error('Error importing shows from top venues:', error);
    results.errors.push(`Global error: ${error instanceof Error ? error.message : String(error)}`);
    return results;
  }
}

/**
 * Fetch popular events to identify top venues
 * @param limit Number of events to fetch
 * @returns Array of popular events
 */
async function fetchPopularEvents(limit = 20) {
  try {
    const params = {
      countryCode: 'US',
      classificationName: 'music',
      sort: 'popularity,desc',
      size: limit.toString()
    };
    
    const data = await callTicketmasterApi('events.json', params);
    return data._embedded?.events || [];
  } catch (error) {
    console.error('Error fetching popular events:', error);
    return [];
  }
}

/**
 * Extract unique venues from events
 * @param events Array of events
 * @param limit Maximum number of venues to return
 * @returns Array of unique venues
 */
function extractUniqueVenues(events: any[], limit = 10) {
  const venueMap = new Map();
  
  for (const event of events) {
    if (event._embedded?.venues && event._embedded.venues.length > 0) {
      const venue = event._embedded.venues[0];
      
      // Only add if it has an ID and we haven't seen it yet
      if (venue.id && !venueMap.has(venue.id)) {
        venueMap.set(venue.id, {
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
        
        // Stop when we have enough venues
        if (venueMap.size >= limit) break;
      }
    }
  }
  
  return Array.from(venueMap.values());
}

/**
 * Fetch events for a specific venue
 * @param venueId Ticketmaster venue ID
 * @param limit Number of events to fetch
 * @returns Array of venue events
 */
async function fetchVenueEvents(venueId: string, limit = 5) {
  try {
    const params = {
      venueId,
      size: limit.toString(),
      sort: 'date,asc'
    };
    
    const data = await callTicketmasterApi('events.json', params);
    return data._embedded?.events || [];
  } catch (error) {
    console.error(`Error fetching events for venue ${venueId}:`, error);
    return [];
  }
}
