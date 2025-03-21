
import { toast } from "sonner";
import { callTicketmasterApi } from "../ticketmaster-config";
import { supabase } from "@/integrations/supabase/client";
import { ErrorSource, handleError } from "@/lib/error-handling";

/**
 * Fetch featured shows
 */
export async function fetchFeaturedShows(limit = 4): Promise<any[]> {
  try {
    console.log(`Fetching ${limit} featured shows directly from Ticketmaster API`);
    
    // Fetch directly from Ticketmaster API
    const data = await callTicketmasterApi('events.json', {
      size: '50', // Get more options to choose from
      segmentName: 'Music',
      sort: 'relevance,desc', // Sort by relevance to get more popular events
      includeFamily: 'no' // Filter out family events
    });

    if (!data._embedded?.events) {
      console.log("No events found in Ticketmaster response");
      return [];
    }

    console.log(`Found ${data._embedded.events.length} events from Ticketmaster`);

    // Filter for events with high-quality images and venue information
    const qualityEvents = data._embedded.events
      .filter((event: any) => 
        // Must have a good quality image
        event.images.some((img: any) => img.ratio === "16_9" && img.width > 500) &&
        // Must have venue information
        event._embedded?.venues?.[0]?.name &&
        // Must have a start date
        event.dates?.start?.dateTime
      )
      // Map to show objects
      .map((event: any) => {
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
            genres: attraction.classifications && attraction.classifications.length > 0 
              ? [attraction.classifications[0].genre?.name, attraction.classifications[0].subGenre?.name].filter(Boolean)
              : []
          };
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
          popularity: qualityScore,
          artist: artistData,
          venue: venue,
          qualityScore
        };
        
        return show;
      });

    // Sort by our quality score and take the top events
    const topShows = qualityEvents
      .sort((a, b) => b.qualityScore - a.qualityScore)
      .slice(0, limit);
    
    // Try to save shows and related data to database in the background without blocking
    setTimeout(() => {
      topShows.forEach(show => {
        try {
          // Save artist
          if (show.artist) {
            Promise.resolve(
              supabase
                .from('artists')
                .upsert({
                  id: show.artist.id,
                  name: show.artist.name,
                  image_url: show.artist.image,
                  genres: show.artist.genres,
                  updated_at: new Date().toISOString()
                })
            )
            .then(() => console.log(`Saved artist ${show.artist.name} to database`))
            .catch((err: any) => console.log(`Database save failed for artist ${show.artist.name}: ${err.message}`));
          }
          
          // Save venue
          if (show.venue) {
            Promise.resolve(
              supabase
                .from('venues')
                .upsert({
                  id: show.venue.id,
                  name: show.venue.name,
                  city: show.venue.city,
                  state: show.venue.state,
                  country: show.venue.country,
                  updated_at: new Date().toISOString()
                })
            )
            .then(() => console.log(`Saved venue ${show.venue.name} to database`))
            .catch((err: any) => console.log(`Database save failed for venue ${show.venue.name}: ${err.message}`));
          }
          
          // Save show
          Promise.resolve(
            supabase
              .from('shows')
              .upsert({
                id: show.id,
                name: show.name,
                date: show.date,
                artist_id: show.artist_id,
                venue_id: show.venue_id,
                ticket_url: show.ticket_url,
                image_url: show.image_url,
                popularity: show.popularity,
                updated_at: new Date().toISOString()
              })
          )
          .then(() => console.log(`Saved show ${show.name} to database`))
          .catch((err: any) => console.log(`Database save failed for show ${show.name}: ${err.message}`));
        } catch (e) {
          // Ignore any errors in the background save
          console.log(`Error in background save for show ${show.name}`);
        }
      });
    }, 0);
    
    return topShows;
  } catch (error) {
    console.error("Ticketmaster featured shows error:", error);
    handleError({
      message: "Failed to load featured shows",
      source: ErrorSource.API,
      originalError: error
    });
    return [];
  }
}
