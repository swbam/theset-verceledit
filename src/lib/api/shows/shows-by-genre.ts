import { callTicketmasterApi } from "../ticketmaster-config";
import { supabase } from "@/integrations/supabase/client";
// Import SyncManager - assuming a singleton instance or instantiate locally
import { SyncManager } from '@/lib/sync/manager';
const syncManager = new SyncManager(); // Instantiate - consider singleton pattern if needed

// Define types for enriched show data (adjust as needed)
type EnrichedShow = {
  id: string;
  name: string;
  date: string | null;
  artist: any | null; // Replace 'any' with a proper Artist type if available
  venue: any | null;  // Replace 'any' with a proper Venue type if available
  ticket_url: string | null;
  image_url: string | null;
};

/**
 * Fetch upcoming shows by genre, triggering sync if not found locally.
 */
export async function fetchShowsByGenre(genreId: string, limit = 8): Promise<EnrichedShow[]> {
  try {
    // Fetch recent shows with artist genres and filter client-side
    console.log(`Fetching shows for genre ID: ${genreId} (client-side filter)`);
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
        artist:artists ( id, name, genres )
      `)
      .gte('date', new Date().toISOString())
      .order('date', { ascending: true })
      .limit(limit * 5); // Fetch more to increase chance of finding matches

    if (dbError) {
      console.error("Error fetching shows by genre from database:", dbError);
      // Proceed to fetch from API even if DB check fails
    }

    // Filter shows based on the artist's genres client-side
    const filteredDbShows = dbShows?.filter(show =>
      show.artist?.genres?.includes(genreId)
    ).slice(0, limit) || [];

    // If we have filtered shows in the database, enrich them further
    if (filteredDbShows && filteredDbShows.length > 0) {
      console.log(`Found ${filteredDbShows.length} shows in DB for genre ${genreId}`);
      const enrichedShows = await Promise.all(filteredDbShows.map(async (show) => {
        // Fetch full venue details if needed (artist details partially fetched already)
        const { data: venueData, error: venueError } = show.venue_id ? await supabase
          .from('venues')
          .select('*')
          .eq('id', show.venue_id)
          .maybeSingle() : { data: null, error: null };

        return {
          id: show.id,
          name: show.name,
          date: show.date,
          artist: show.artist, // Already fetched basic artist info
          venue: venueData || null,
          ticket_url: show.ticket_url,
          image_url: show.image_url
        };
      }));
      return enrichedShows;
    }

    // --- Fetch from Ticketmaster API if not enough found in DB ---
    console.log(`Fetching shows for genre ${genreId} from Ticketmaster API...`);
    const tmData = await callTicketmasterApi('events.json', {
      classificationId: genreId, // Use classificationId for genre lookup in TM
      segmentName: 'Music',
      sort: 'date,asc', // Get upcoming dates
      size: limit.toString() // Fetch requested limit
    });

    if (!tmData._embedded?.events) {
      console.log(`No shows found on Ticketmaster for genre ${genreId}`);
      return [];
    }

    const showsFromApiPromises = tmData._embedded.events.map(async (event: any): Promise<EnrichedShow | null> => {
      try {
        // --- Process Artist ---
        let artistName = '';
        let artistId: string | null = null;
        let artistData: { id: string; name: string; image?: any; upcoming_shows?: number; genres?: string[] } | null = null;

        if (event._embedded?.attractions?.[0]) {
          const attraction = event._embedded.attractions[0];
          artistName = attraction.name;
          artistId = attraction.id;

          if (typeof artistId === 'string') {
            artistData = {
              id: artistId,
              name: artistName,
              image: attraction.images?.find((img: any) => img.ratio === "16_9" && img.width > 500)?.url,
              upcoming_shows: 1, // Placeholder
              genres: [event.classifications?.[0]?.genre?.name].filter(Boolean)
            };
            // Queue artist sync task
            await syncManager.enqueueTask({ type: 'artist', id: artistId, operation: 'create', priority: 'medium' });
          }
        } else {
           console.warn(`Artist ID not found for event ${event.id}`);
           return null; // Skip this event if no artist ID
        }

        // --- Process Venue ---
        let venue: { id: string; name: string; city?: string; state?: string; country?: string; } | null = null;
        let venueId: string | null = null;

        if (event._embedded?.venues?.[0]) {
          const venueData = event._embedded.venues[0];
          venueId = venueData.id;
          if (typeof venueId === 'string') {
            venue = {
              id: venueId,
              name: venueData.name,
              city: venueData.city?.name,
              state: venueData.state?.name,
              country: venueData.country?.name,
            };
            // Queue venue sync task
            await syncManager.enqueueTask({ type: 'venue', id: venueId, operation: 'create', priority: 'medium' });
          }
        } else {
             console.warn(`Venue ID not found for event ${event.id}`);
        }

         // --- Process Date ---
        let formattedDate: string | null = null;
        if (event.dates?.start?.dateTime) {
          try {
            const dateObject = new Date(event.dates.start.dateTime);
            if (!isNaN(dateObject.getTime())) {
              formattedDate = dateObject.toISOString();
            } else if (event.dates.start.localDate) {
              const localDate = new Date(event.dates.start.localDate);
              if (!isNaN(localDate.getTime())) {
                formattedDate = localDate.toISOString();
              }
            }
          } catch (dateError) {
            console.error(`Error processing date for event ${event.id}:`, dateError);
          }
        }

        // --- Construct Show Object ---
        // Ensure artistId and venueId are not null before creating the final object if needed by type
        if (!artistId) return null; // Cannot create show link without artist

        const showForDisplay: EnrichedShow = {
          id: event.id,
          name: event.name,
          date: formattedDate,
          artist: artistData, // Use object created above
          venue: venue,       // Use object created above
          ticket_url: event.url || null,
          image_url: event.images?.find((img: any) => img.ratio === "16_9" && img.width > 500)?.url || null,
          // artist_id and venue_id are not part of EnrichedShow, but needed for sync task payload
        };

        // Queue show sync task
        await syncManager.enqueueTask({
            type: 'show',
            id: event.id,
            operation: 'create',
            priority: 'medium',
            // Pass related IDs in payload if sync service needs them
            payload: { artist_external_id: artistId, venue_external_id: venueId, genre_ids: [genreId] }
        });

        return showForDisplay;
      } catch (mapError) {
         console.error(`Error processing event ${event.id} in map:`, mapError);
         return null; // Skip this event if processing fails
      }
    }); // End of .map()

    const showsFromApi = await Promise.all(showsFromApiPromises);

    // Filter out any null results from failed processing
    return showsFromApi.filter((show): show is EnrichedShow => show !== null);

  } catch (error) {
    console.error("Error fetching shows by genre:", error);
    return []; // Return empty array on error
  }
}
