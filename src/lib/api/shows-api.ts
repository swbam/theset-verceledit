
import { toast } from "sonner";
import { callTicketmasterApi } from "./ticketmaster-config";
import { supabase } from "@/integrations/supabase/client";
import { saveArtistToDatabase, saveShowToDatabase, saveVenueToDatabase } from "./database-utils";
import { getArtistByName } from "@/lib/spotify";

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

/**
 * Fetch details for a specific show
 */
export async function fetchShowDetails(eventId: string): Promise<any> {
  try {
    console.log(`Fetching details for show ID: ${eventId}`);
    
    // First check if we have this show in the database
    const { data: dbShow, error: dbError } = await supabase
      .from('shows')
      .select(`
        id, 
        name, 
        date, 
        artist_id,
        venue_id,
        ticket_url,
        image_url
      `)
      .eq('id', eventId)
      .maybeSingle();
    
    if (dbError) {
      console.error("Error fetching show from database:", dbError);
    }
    
    if (dbShow) {
      console.log(`Found show in database: ${dbShow.name}`);
      
      // Fetch related artist and venue
      const [artistResult, venueResult] = await Promise.all([
        dbShow.artist_id ? supabase
          .from('artists')
          .select('*')
          .eq('id', dbShow.artist_id)
          .maybeSingle() : null,
        dbShow.venue_id ? supabase
          .from('venues')
          .select('*')
          .eq('id', dbShow.venue_id)
          .maybeSingle() : null
      ]);
      
      const enrichedShow = {
        id: dbShow.id,
        name: dbShow.name,
        date: dbShow.date,
        artist: artistResult?.data || null,
        venue: venueResult?.data || null,
        ticket_url: dbShow.ticket_url,
        image_url: dbShow.image_url,
        artist_id: dbShow.artist_id,
        venue_id: dbShow.venue_id
      };
      
      console.log("Returning enriched show from database:", enrichedShow);
      return enrichedShow;
    }
    
    // If not in database, fetch from Ticketmaster
    console.log(`Show not found in database, fetching from Ticketmaster API...`);
    const event = await callTicketmasterApi(`events/${eventId}.json`);
    
    if (!event) {
      console.error(`No event found with ID: ${eventId}`);
      throw new Error("Show not found");
    }
    
    console.log(`Fetched show from Ticketmaster: ${event.name}`);
    
    // Get artist from attractions if available
    let artistName = '';
    let artistId = '';
    let artistData = null;
    
    if (event._embedded?.attractions && event._embedded.attractions.length > 0) {
      const attraction = event._embedded.attractions[0];
      artistName = attraction.name;
      artistId = attraction.id;
      
      // Create artist object
      artistData = {
        id: artistId,
        name: artistName,
        image: attraction.images?.find((img: any) => img.ratio === "16_9" && img.width > 500)?.url,
        upcoming_shows: 1
      };
      
      // Save artist to database
      const savedArtist = await saveArtistToDatabase(artistData);
      console.log(`Saved artist from show details: ${artistName}`, savedArtist ? "Success" : "Failed");
    } else {
      // Fallback to extracting from event name
      artistName = event.name.split(' at ')[0].split(' - ')[0].trim();
      artistId = `tm-${encodeURIComponent(artistName.toLowerCase().replace(/\s+/g, '-'))}`;
      
      // Create minimal artist data
      artistData = {
        id: artistId,
        name: artistName
      };
      
      // Save this minimal artist too
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
        address: venueData.address?.line1
      };
      venueId = venueData.id;
      
      // Save venue to database
      const savedVenue = await saveVenueToDatabase(venue);
      console.log(`Saved venue from show details: ${venue.name}`, savedVenue ? "Success" : "Failed");
    }
    
    // Create show object
    const show = {
      id: event.id,
      name: event.name,
      date: event.dates.start.dateTime,
      artist: artistData,
      venue: venue,
      ticket_url: event.url,
      image_url: event.images.find((img: any) => img.ratio === "16_9" && img.width > 500)?.url,
      artist_id: artistId,
      venue_id: venueId
    };
    
    // Save show to database
    const savedShow = await saveShowToDatabase(show);
    console.log(`Saved show from show details: ${show.name}`, savedShow ? "Success" : "Failed");
    
    return show;
  } catch (error) {
    console.error("Show details error:", error);
    toast.error("Failed to load show details");
    throw error;
  }
}

/**
 * Fetch venue details
 */
export async function fetchVenueDetails(venueId: string): Promise<any> {
  try {
    // First check if we have this venue in the database
    const { data: venue, error } = await supabase
      .from('venues')
      .select('*')
      .eq('id', venueId)
      .maybeSingle();
    
    if (error) {
      console.error("Error fetching venue from database:", error);
    }
    
    if (venue) {
      return venue;
    }
    
    // If not in database, fetch from Ticketmaster
    const venueData = await callTicketmasterApi(`venues/${venueId}.json`);
    
    // Create venue object
    const venueObject = {
      id: venueData.id,
      name: venueData.name,
      city: venueData.city?.name,
      state: venueData.state?.name,
      country: venueData.country?.name,
      address: venueData.address?.line1,
      postal_code: venueData.postalCode,
      location: {
        latitude: venueData.location?.latitude,
        longitude: venueData.location?.longitude
      }
    };
    
    // Save venue to database
    await saveVenueToDatabase(venueObject);
    
    return venueObject;
  } catch (error) {
    console.error("Venue details error:", error);
    toast.error("Failed to load venue details");
    throw error;
  }
}

/**
 * Fetch upcoming shows by genre
 */
export async function fetchShowsByGenre(genreId: string, limit = 8): Promise<any[]> {
  try {
    // First check if we have shows in the database for this genre
    const { data: dbShows, error: dbError } = await supabase
      .from('shows')
      .select(`
        id, 
        name, 
        date, 
        artist_id,
        venue_id,
        ticket_url,
        image_url,
        genre_ids
      `)
      .contains('genre_ids', [genreId])
      .gte('date', new Date().toISOString())
      .order('date', { ascending: true })
      .limit(limit);
    
    if (dbError) {
      console.error("Error fetching shows by genre from database:", dbError);
    }
    
    // If we have shows in the database, enrich them with artist and venue data
    if (dbShows && dbShows.length > 0) {
      const enrichedShows = await Promise.all(dbShows.map(async (show) => {
        const [artistResult, venueResult] = await Promise.all([
          show.artist_id ? supabase
            .from('artists')
            .select('*')
            .eq('id', show.artist_id)
            .maybeSingle() : null,
          show.venue_id ? supabase
            .from('venues')
            .select('*')
            .eq('id', show.venue_id)
            .maybeSingle() : null
        ]);
        
        return {
          id: show.id,
          name: show.name,
          date: show.date,
          artist: artistResult?.data || null,
          venue: venueResult?.data || null,
          ticket_url: show.ticket_url,
          image_url: show.image_url
        };
      }));
      
      return enrichedShows;
    }
    
    // Fetch from Ticketmaster API
    const data = await callTicketmasterApi('events.json', {
      classificationId: genreId,
      segmentName: 'Music',
      sort: 'relevance,desc', // Sort by relevance to get popular shows first
      size: limit.toString()
    });

    if (!data._embedded?.events) {
      return [];
    }

    const shows = await Promise.all(data._embedded.events.map(async (event: any) => {
      // Get artist from attractions if available
      let artistName = '';
      let artistId = '';
      let artistData = null;
      
      if (event._embedded?.attractions && event._embedded.attractions.length > 0) {
        const attraction = event._embedded.attractions[0];
        artistName = attraction.name;
        artistId = attraction.id;
        
        // Create artist object
        artistData = {
          id: artistId,
          name: artistName,
          image: attraction.images?.find((img: any) => img.ratio === "16_9" && img.width > 500)?.url,
          upcoming_shows: 1,
          genres: [event.classifications?.[0]?.genre?.name].filter(Boolean)
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
        date: event.dates.start.dateTime,
        artist_id: artistId,
        venue_id: venueId,
        ticket_url: event.url,
        image_url: event.images.find((img: any) => img.ratio === "16_9" && img.width > 500)?.url,
        genre_ids: [genreId]
      };
      
      // Save show to database
      await saveShowToDatabase(show);
      
      return {
        ...show,
        artist: artistData,
        venue: venue
      };
    }));

    return shows;
  } catch (error) {
    console.error("Ticketmaster events by genre error:", error);
    toast.error("Failed to load shows for this genre");
    return [];
  }
}

/**
 * Fetch featured shows
 */
export async function fetchFeaturedShows(limit = 4): Promise<any[]> {
  try {
    // Check if we have featured shows in the database
    const { data: dbShows, error: dbError } = await supabase
      .from('shows')
      .select(`
        id, 
        name, 
        date, 
        artist_id,
        venue_id,
        ticket_url,
        image_url,
        popularity
      `)
      .gte('date', new Date().toISOString())
      .order('popularity', { ascending: false })
      .limit(limit);
    
    if (dbError) {
      console.error("Error fetching featured shows from database:", dbError);
    }
    
    // If we have enough shows in database, enrich them with artist and venue data
    if (dbShows && dbShows.length >= limit) {
      const enrichedShows = await Promise.all(dbShows.map(async (show) => {
        const [artistResult, venueResult] = await Promise.all([
          show.artist_id ? supabase
            .from('artists')
            .select('*')
            .eq('id', show.artist_id)
            .maybeSingle() : null,
          show.venue_id ? supabase
            .from('venues')
            .select('*')
            .eq('id', show.venue_id)
            .maybeSingle() : null
        ]);
        
        return {
          id: show.id,
          name: show.name,
          date: show.date,
          artist: artistResult?.data || null,
          venue: venueResult?.data || null,
          ticket_url: show.ticket_url,
          image_url: show.image_url
        };
      }));
      
      return enrichedShows;
    }
    
    // Fetch from Ticketmaster API
    const data = await callTicketmasterApi('events.json', {
      size: '50', // Get more options to choose from
      segmentName: 'Music',
      sort: 'relevance,desc', // Sort by relevance to get more popular events
      includeFamily: 'no' // Filter out family events
    });

    if (!data._embedded?.events) {
      return [];
    }

    // Filter for events with high-quality images and venue information
    const qualityEvents = await Promise.all(
      data._embedded.events
        .filter((event: any) => 
          // Must have a good quality image
          event.images.some((img: any) => img.ratio === "16_9" && img.width > 500) &&
          // Must have venue information
          event._embedded?.venues?.[0]?.name &&
          // Must have a start date
          event.dates?.start?.dateTime
        )
        // Calculate a "quality score" for each event
        .map(async (event: any) => {
          // Get artist from attractions if available
          let artistName = '';
          let artistId = '';
          let artistData = null;
          
          if (event._embedded?.attractions && event._embedded.attractions.length > 0) {
            const attraction = event._embedded.attractions[0];
            artistName = attraction.name;
            artistId = attraction.id;
            
            // Create artist object
            artistData = {
              id: artistId,
              name: artistName,
              image: attraction.images?.find((img: any) => img.ratio === "16_9" && img.width > 500)?.url,
              upcoming_shows: 1
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
          
          // Calculate a quality score based on various factors
          const qualityScore = (
            (event.rank || 0) * 2 + 
            (event._embedded?.venues?.[0]?.upcomingEvents?.totalEvents || 0) / 5 +
            (event.dates?.status?.code === "onsale" ? 5 : 0) +
            (event._embedded?.attractions?.length || 0) * 2
          );
          
          // Create show object
          const show = {
            id: event.id,
            name: event.name,
            date: event.dates.start.dateTime,
            artist_id: artistId,
            venue_id: venueId,
            ticket_url: event.url,
            image_url: event.images.find((img: any) => img.ratio === "16_9" && img.width > 500)?.url,
            popularity: qualityScore
          };
          
          // Save show to database
          await saveShowToDatabase(show);
          
          return {
            ...show,
            artist: artistData,
            venue: venue,
            qualityScore
          };
        })
    );

    // Sort by our quality score and take the top events
    return qualityEvents
      .sort((a, b) => b.qualityScore - a.qualityScore)
      .slice(0, limit);
  } catch (error) {
    console.error("Ticketmaster featured shows error:", error);
    toast.error("Failed to load featured shows");
    return [];
  }
}
