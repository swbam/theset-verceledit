import { supabase } from '@/lib/supabase';
import { getTrendingConcerts } from '@/lib/api/ticketmaster-config';
import { saveArtistToDatabase } from '@/lib/api/db/artist-utils';
import { saveVenueToDatabase } from '@/lib/api/db/venue-utils';
import { saveShowToDatabase } from '@/lib/api/database-utils';

/**
 * Import trending shows from Ticketmaster and save them to the database
 * This function is meant to be called once per day via a cron job
 * to avoid unnecessary API calls while keeping the trending shows up to date
 */
export async function importTrendingShows() {
  console.log('Starting daily import of trending shows from Ticketmaster...');
  
  try {
    // Fetch trending concerts from Ticketmaster
    const events = await getTrendingConcerts(20);
    
    if (!events || events.length === 0) {
      console.log('No trending shows found from Ticketmaster API');
      return { success: false, message: 'No trending shows found' };
    }
    
    console.log(`Found ${events.length} trending shows from Ticketmaster`);
    
    // Process each event and save to database
    const savedShows = [];
    let errorCount = 0;
    
    for (const event of events) {
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
        const showId = await saveShowToDatabase(show);
        
        if (showId) {
          savedShows.push(showId);
        } else {
          errorCount++;
        }
      } catch (error) {
        console.error(`Error processing event ${event.id}:`, error);
        errorCount++;
      }
    }
    
    console.log(`Successfully imported ${savedShows.length} trending shows with ${errorCount} errors`);
    
    return { 
      success: true, 
      savedCount: savedShows.length,
      errorCount,
      totalEvents: events.length
    };
  } catch (error) {
    console.error('Error importing trending shows:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : String(error) 
    };
  }
}