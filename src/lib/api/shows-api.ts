
import { toast } from "sonner";
import { callTicketmasterApi } from "./ticketmaster-config";
import { supabase } from "@/integrations/supabase/client";
import { saveArtistToDatabase } from "./artist-api";

/**
 * Fetch upcoming shows for an artist
 */
export async function fetchArtistEvents(artistIdentifier: string): Promise<any[]> {
  try {
    // First check if we have shows in the database for this artist
    let { data: dbShows, error: dbError } = await supabase
      .from('shows')
      .select(`
        id, 
        name, 
        date, 
        venue:venues(id, name, city, state, country),
        ticket_url,
        image_url
      `)
      .eq('artist_id', artistIdentifier)
      .gte('date', new Date().toISOString())
      .order('date', { ascending: true });
    
    // If we have shows in the database that are current, return them
    if (dbShows && dbShows.length > 0) {
      return dbShows.map(show => ({
        ...show,
        venue: show.venue || null
      }));
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
    
    // Fetch from Ticketmaster API
    const data = await callTicketmasterApi('events.json', {
      ...searchParam,
      segmentName: 'Music',
      sort: 'date,asc'
    });

    if (!data._embedded?.events) {
      return [];
    }

    const shows = await Promise.all(data._embedded.events.map(async (event: any) => {
      // Get artist info from the event
      let artistName = '';
      let artistId = '';
      
      if (event._embedded?.attractions && event._embedded.attractions.length > 0) {
        const attraction = event._embedded.attractions[0];
        artistName = attraction.name;
        artistId = attraction.id;
        
        // Save artist to database
        await saveArtistToDatabase({
          id: artistId,
          name: artistName,
          image: attraction.images?.find((img: any) => img.ratio === "16_9" && img.width > 500)?.url,
          upcoming_shows: 1
        });
      } else {
        // Fallback to extracting from event name
        artistName = event.name.split(' at ')[0].split(' - ')[0].trim();
        artistId = artistIdentifier;
      }
      
      // Process venue
      let venue = null;
      if (event._embedded?.venues?.[0]) {
        const venueData = event._embedded.venues[0];
        venue = {
          id: venueData.id,
          name: venueData.name,
          city: venueData.city?.name,
          state: venueData.state?.name,
          country: venueData.country?.name,
        };
        
        // Save venue to database
        await saveVenueToDatabase(venue);
      }
      
      // Create show object
      const show = {
        id: event.id,
        name: event.name,
        date: event.dates.start.dateTime,
        venue: venue,
        ticket_url: event.url,
        image_url: event.images.find((img: any) => img.ratio === "16_9" && img.width > 500)?.url,
        artist_id: artistId
      };
      
      // Save show to database
      await saveShowToDatabase(show);
      
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
        image_url,
        artists(id, name),
        venues(id, name, city, state, country, address)
      `)
      .eq('id', eventId)
      .maybeSingle();
    
    if (dbShow) {
      return {
        id: dbShow.id,
        name: dbShow.name,
        date: dbShow.date,
        artist: dbShow.artists,
        venue: dbShow.venues,
        ticket_url: dbShow.ticket_url,
        image_url: dbShow.image_url,
        artist_id: dbShow.artist_id,
        venue_id: dbShow.venue_id
      };
    }
    
    // If not in database, fetch from Ticketmaster
    const event = await callTicketmasterApi(`events/${eventId}.json`);
    
    // Get artist from attractions if available
    let artistName = '';
    let artistId = '';
    
    if (event._embedded?.attractions && event._embedded.attractions.length > 0) {
      const attraction = event._embedded.attractions[0];
      artistName = attraction.name;
      artistId = attraction.id;
      
      // Save artist to database
      await saveArtistToDatabase({
        id: artistId,
        name: artistName,
        image: attraction.images?.find((img: any) => img.ratio === "16_9" && img.width > 500)?.url,
        upcoming_shows: 1
      });
    } else {
      // Fallback to extracting from event name
      artistName = event.name.split(' at ')[0].split(' - ')[0].trim();
      artistId = `tm-${encodeURIComponent(artistName.toLowerCase().replace(/\s+/g, '-'))}`;
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
      await saveVenueToDatabase(venue);
    }
    
    // Create show object
    const show = {
      id: event.id,
      name: event.name,
      date: event.dates.start.dateTime,
      artist: {
        id: artistId,
        name: artistName,
      },
      venue: venue,
      ticket_url: event.url,
      image_url: event.images.find((img: any) => img.ratio === "16_9" && img.width > 500)?.url,
      artist_id: artistId,
      venue_id: venueId
    };
    
    // Save show to database
    await saveShowToDatabase(show);
    
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
        artists(id, name),
        venue_id,
        venues(id, name, city, state, country),
        ticket_url,
        image_url,
        genre_ids
      `)
      .contains('genre_ids', [genreId])
      .gte('date', new Date().toISOString())
      .order('date', { ascending: true })
      .limit(limit);
    
    // If we have shows in the database, return them
    if (dbShows && dbShows.length > 0) {
      return dbShows.map(show => ({
        id: show.id,
        name: show.name,
        date: show.date,
        artist: show.artists,
        venue: show.venues,
        ticket_url: show.ticket_url,
        image_url: show.image_url
      }));
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
      
      if (event._embedded?.attractions && event._embedded.attractions.length > 0) {
        const attraction = event._embedded.attractions[0];
        artistName = attraction.name;
        artistId = attraction.id;
        
        // Save artist to database
        await saveArtistToDatabase({
          id: artistId,
          name: artistName,
          image: attraction.images?.find((img: any) => img.ratio === "16_9" && img.width > 500)?.url,
          upcoming_shows: 1,
          genres: [event.classifications?.[0]?.genre?.name].filter(Boolean)
        });
      } else {
        // Fallback to extracting from event name
        artistName = event.name.split(' at ')[0].split(' - ')[0].trim();
        artistId = `tm-${encodeURIComponent(artistName.toLowerCase().replace(/\s+/g, '-'))}`;
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
        artist: {
          id: artistId,
          name: artistName
        },
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
        artists(id, name),
        venue_id,
        venues(id, name, city, state, country),
        ticket_url,
        image_url,
        popularity
      `)
      .gte('date', new Date().toISOString())
      .order('popularity', { ascending: false })
      .limit(limit);
    
    // If we have enough shows in database, use them
    if (dbShows && dbShows.length >= limit) {
      return dbShows.map(show => ({
        id: show.id,
        name: show.name,
        date: show.date,
        artist: show.artists,
        venue: show.venues,
        ticket_url: show.ticket_url,
        image_url: show.image_url
      }));
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
          
          if (event._embedded?.attractions && event._embedded.attractions.length > 0) {
            const attraction = event._embedded.attractions[0];
            artistName = attraction.name;
            artistId = attraction.id;
            
            // Save artist to database
            await saveArtistToDatabase({
              id: artistId,
              name: artistName,
              image: attraction.images?.find((img: any) => img.ratio === "16_9" && img.width > 500)?.url,
              upcoming_shows: 1
            });
          } else {
            // Fallback to extracting from event name
            artistName = event.name.split(' at ')[0].split(' - ')[0].trim();
            artistId = `tm-${encodeURIComponent(artistName.toLowerCase().replace(/\s+/g, '-'))}`;
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
            artist: {
              name: artistName,
              id: artistId
            },
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

/**
 * Save venue to database
 */
async function saveVenueToDatabase(venue: any) {
  try {
    if (!venue || !venue.id) return;
    
    // Check if venue already exists
    const { data: existingVenue } = await supabase
      .from('venues')
      .select('id, updated_at')
      .eq('id', venue.id)
      .maybeSingle();
    
    // If venue exists and was updated recently, don't update
    if (existingVenue) {
      const lastUpdated = new Date(existingVenue.updated_at);
      const now = new Date();
      const daysSinceUpdate = (now.getTime() - lastUpdated.getTime()) / (1000 * 60 * 60 * 24);
      
      // Only update if it's been more than 30 days (venues change rarely)
      if (daysSinceUpdate < 30) {
        return;
      }
    }
    
    // Insert or update venue
    const { error } = await supabase.from('venues').upsert({
      id: venue.id,
      name: venue.name,
      city: venue.city,
      state: venue.state,
      country: venue.country,
      address: venue.address,
      postal_code: venue.postal_code,
      location: venue.location,
      updated_at: new Date().toISOString()
    });
    
    if (error) {
      console.error("Error saving venue to database:", error);
    }
  } catch (error) {
    console.error("Error in saveVenueToDatabase:", error);
  }
}

/**
 * Save show to database
 */
async function saveShowToDatabase(show: any) {
  try {
    if (!show || !show.id) return;
    
    // Check if show already exists
    const { data: existingShow } = await supabase
      .from('shows')
      .select('id, updated_at')
      .eq('id', show.id)
      .maybeSingle();
    
    // If show exists and was updated recently, don't update
    if (existingShow) {
      const lastUpdated = new Date(existingShow.updated_at);
      const now = new Date();
      const hoursSinceUpdate = (now.getTime() - lastUpdated.getTime()) / (1000 * 60 * 60);
      
      // Only update if it's been more than 24 hours
      if (hoursSinceUpdate < 24) {
        return;
      }
    }
    
    // Insert or update show
    const { error } = await supabase.from('shows').upsert({
      id: show.id,
      name: show.name,
      date: show.date,
      artist_id: show.artist_id,
      venue_id: show.venue_id,
      ticket_url: show.ticket_url,
      image_url: show.image_url,
      genre_ids: show.genre_ids || [],
      popularity: show.popularity || 0,
      updated_at: new Date().toISOString()
    });
    
    if (error) {
      console.error("Error saving show to database:", error);
    }
  } catch (error) {
    console.error("Error in saveShowToDatabase:", error);
  }
}

export { saveVenueToDatabase, saveArtistToDatabase, saveShowToDatabase };
