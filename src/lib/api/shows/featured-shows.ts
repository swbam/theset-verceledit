
import { toast } from "sonner";
import { callTicketmasterApi } from "../ticketmaster-config";
import { supabase } from "@/integrations/supabase/client";
import { saveArtistToDatabase, saveShowToDatabase, saveVenueToDatabase } from "../database-utils";

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
