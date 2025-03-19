
import { toast } from "sonner";
import { callTicketmasterApi } from "../ticketmaster-config";
import { supabase } from "@/integrations/supabase/client";
import { saveArtistToDatabase, saveShowToDatabase, saveVenueToDatabase } from "../database-utils";

/**
 * Fetch upcoming shows for an artist
 */
export async function fetchArtistEvents(artistIdentifier: string): Promise<any[]> {
  try {
    console.log(`Fetching events for artist ID: ${artistIdentifier}`);
    
    // First check if we have shows in the database for this artist
    const { data: dbShows, error: dbError } = await supabase
      .from('shows')
      .select(`
        id, 
        name, 
        date, 
        venue_id,
        ticket_url,
        image_url
      `)
      .eq('artist_id', artistIdentifier)
      .gte('date', new Date().toISOString())
      .order('date', { ascending: true });
    
    if (dbError) {
      console.error("Error fetching shows from database:", dbError);
    }
    
    // If we have shows in the database, fetch venue details for each show
    if (dbShows && dbShows.length > 0) {
      console.log(`Found ${dbShows.length} shows in database for artist ${artistIdentifier}`);
      
      const showsWithVenues = await Promise.all(dbShows.map(async (show) => {
        if (show.venue_id) {
          const { data: venue } = await supabase
            .from('venues')
            .select('*')
            .eq('id', show.venue_id)
            .maybeSingle();
          
          return {
            ...show,
            venue: venue || null
          };
        }
        return {
          ...show,
          venue: null
        };
      }));
      
      return showsWithVenues;
    }
    
    // Determine search parameter based on ID format
    let searchParam: any = {};
    
    if (artistIdentifier.startsWith('K')) {
      // Ticketmaster ID
      searchParam = { attractionId: artistIdentifier };
    } else if (artistIdentifier.startsWith('tm-')) {
      // Custom ID with artist name
      const artistName = decodeURIComponent(artistIdentifier.replace('tm-', '')).replace(/-/g, ' ');
      searchParam = { keyword: artistName };
    } else {
      // Treat as keyword
      searchParam = { keyword: artistIdentifier };
    }
    
    console.log(`Fetching from Ticketmaster API with params:`, searchParam);
    
    // Fetch from Ticketmaster API
    const data = await callTicketmasterApi('events.json', {
      ...searchParam,
      segmentName: 'Music',
      sort: 'date,asc'
    });

    if (!data._embedded?.events) {
      console.log(`No events found for artist ID: ${artistIdentifier}`);
      return [];
    }

    console.log(`Found ${data._embedded.events.length} events from Ticketmaster for artist ID: ${artistIdentifier}`);
    
    const shows = await Promise.all(data._embedded.events.map(async (event: any) => {
      // Get artist info from the event
      let artistName = '';
      let artistId = '';
      
      if (event._embedded?.attractions && event._embedded.attractions.length > 0) {
        const attraction = event._embedded.attractions[0];
        artistName = attraction.name;
        artistId = attraction.id;
        
        // Save artist to database
        const savedArtist = await saveArtistToDatabase({
          id: artistId,
          name: artistName,
          image: attraction.images?.find((img: any) => img.ratio === "16_9" && img.width > 500)?.url,
          upcoming_shows: 1
        });
        
        console.log(`Saved artist: ${artistName} to database:`, savedArtist ? "Success" : "Failed");
      } else {
        // Fallback to extracting from event name
        artistName = event.name.split(' at ')[0].split(' - ')[0].trim();
        artistId = artistIdentifier;
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
        const savedVenue = await saveVenueToDatabase(venue);
        console.log(`Saved venue: ${venue.name} to database:`, savedVenue ? "Success" : "Failed");
      }
      
      // Create show object
      const show = {
        id: event.id,
        name: event.name,
        date: event.dates.start.dateTime,
        venue: venue,
        ticket_url: event.url,
        image_url: event.images.find((img: any) => img.ratio === "16_9" && img.width > 500)?.url,
        artist_id: artistId,
        venue_id: venueId
      };
      
      // Save show to database
      const savedShow = await saveShowToDatabase(show);
      console.log(`Saved show: ${show.name} to database:`, savedShow ? "Success" : "Failed");
      
      return show;
    }));

    return shows;
  } catch (error) {
    console.error("Ticketmaster event error:", error);
    toast.error("Failed to load upcoming shows");
    return [];
  }
}
