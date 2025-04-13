import { toast } from "sonner";
import { callTicketmasterApi } from "../ticketmaster-config";
import { supabase } from "@/integrations/supabase/client";
// Import SyncManager - assuming a singleton instance or instantiate locally
import { SyncManager } from '@/lib/sync/manager';
const syncManager = new SyncManager(); // Instantiate - consider singleton pattern if needed

// Define a more specific type for the show object returned by this function
// Adjust properties based on what the calling code actually needs
type FetchedShowDetails = {
  id: string;
  name: string;
  date: string | null;
  artist: { id: string; name: string; image?: any; upcoming_shows?: number } | null;
  // Allow null for optional venue properties to match DB types
  venue: { id: string; name: string; city?: string | null | undefined; state?: string | null | undefined; country?: string | null | undefined; address?: string | null | undefined; } | null;
  ticket_url: string | null;
  image_url: string | null;
  artist_id: string | null;
  venue_id: string | null;
};


/**
 * Fetch details for a specific show, triggering sync if not found locally.
 */
export async function fetchShowDetails(eventId: string): Promise<FetchedShowDetails | null> { // Return specific type or null
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
      // Don't throw, proceed to fetch from API
    }

    if (dbShow) {
      console.log(`Found show in database: ${dbShow.name}`);

      // Fetch related artist and venue
      const [artistResult, venueResult] = await Promise.all([
        dbShow.artist_id ? supabase
          .from('artists')
          .select('*')
          .eq('id', dbShow.artist_id)
          .maybeSingle() : Promise.resolve({ data: null }), // Ensure promise resolves
        dbShow.venue_id ? supabase
          .from('venues')
          .select('*')
          .eq('id', dbShow.venue_id)
          .maybeSingle() : Promise.resolve({ data: null }) // Ensure promise resolves
      ]);

      // Construct the return object matching FetchedShowDetails
      const enrichedShow: FetchedShowDetails = {
        id: dbShow.id, // id is string here
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
      // Optionally trigger a background refresh
      await syncManager.enqueueTask({ type: 'show', id: eventId, operation: 'refresh', priority: 'low' });
      return enrichedShow;
    }

    // If not in database, fetch from Ticketmaster
    console.log(`Show not found in database, fetching from Ticketmaster API...`);
    // Define expected structure from Ticketmaster API call
    // This helps with type safety later
    const event = await callTicketmasterApi(`events/${eventId}.json`) as any; // Use 'as any' for now, or define TM types

    if (!event || !event.id) { // Check event and event.id
      console.error(`No event found or event missing ID: ${eventId}`);
      throw new Error("Show not found");
    }

    console.log(`Fetched show from Ticketmaster: ${event.name}`);

    // --- Process Artist ---
    let artistName = '';
    let artistId: string | null = null;
    let artistData: { id: string; name: string; image?: any; upcoming_shows?: number } | null = null;

    if (event._embedded?.attractions?.[0]) {
      const attraction = event._embedded.attractions[0];
      artistName = attraction.name;
      artistId = attraction.id; // Should be string from TM

      if (typeof artistId === 'string') {
        artistData = {
          id: artistId,
          name: artistName,
          image: attraction.images?.find((img: any) => img.ratio === "16_9" && img.width > 500)?.url,
          upcoming_shows: 1
        };
        // Queue artist sync task
        await syncManager.enqueueTask({
          type: 'artist',
          id: artistId,
          operation: 'create',
          priority: 'high'
        });
        console.log(`Queued sync task for artist: ${artistName} (ID: ${artistId})`);
      }
    } else {
      // Fallback - Less reliable
      artistName = event.name.split(' at ')[0].split(' - ')[0].trim();
      // Generate a temporary/placeholder ID if needed, but ideally sync handles this
      // artistId = `tm-fallback-${encodeURIComponent(artistName.toLowerCase().replace(/\s+/g, '-'))}`;
      // artistData = { id: artistId, name: artistName };
      // console.warn(`Artist ID not found in TM data for event ${event.id}. Sync might fail or create partial data.`);
      // Optionally queue with just the name if your sync service can handle lookups?
      // For now, we'll leave artistId and artistData as null if not found directly.
      artistId = null;
      artistData = null;
      console.warn(`Could not reliably determine artist ID for event ${event.id}`);
    }

    // --- Process Venue ---
    let venue: { id: string; name: string; city?: string; state?: string; country?: string; address?: string } | null = null;
    let venueId: string | null = null;

    if (event._embedded?.venues?.[0]) {
      const venueData = event._embedded.venues[0];
      venueId = venueData.id; // Should be string from TM

      if (typeof venueId === 'string') {
        venue = {
          id: venueId,
          name: venueData.name,
          city: venueData.city?.name,
          state: venueData.state?.name,
          country: venueData.country?.name,
          address: venueData.address?.line1
        };
        // Queue venue sync task
        await syncManager.enqueueTask({
          type: 'venue',
          id: venueId,
          operation: 'create',
          priority: 'high'
        });
        console.log(`Queued sync task for venue: ${venue.name} (ID: ${venueId})`);
      }
    } else {
        console.warn(`Venue ID not found in TM data for event ${event.id}`);
    }

    // --- Process Date ---
    let formattedDate: string | null = null;
    if (event.dates?.start?.dateTime) {
      try {
        const dateObject = new Date(event.dates.start.dateTime);
        if (!isNaN(dateObject.getTime())) {
          formattedDate = dateObject.toISOString();
        } else {
          // Fallback to localDate if dateTime is invalid
          if (event.dates.start.localDate) {
            const localDate = new Date(event.dates.start.localDate);
            if (!isNaN(localDate.getTime())) {
              formattedDate = localDate.toISOString(); // Use localDate if valid
            } else {
                 console.error('Invalid localDate from Ticketmaster:', event.dates.start.localDate);
            }
          } else {
             console.error('Invalid dateTime and no localDate from Ticketmaster:', event.dates.start.dateTime);
          }
        }
      } catch (dateError) {
        console.error('Error processing show date:', dateError);
      }
    }

    // --- Construct Show Object for Return ---
    // This object is for immediate display, using data directly from the API fetch
    const showForDisplay: FetchedShowDetails = {
      id: event.id, // event.id is guaranteed string if event exists
      name: event.name,
      date: formattedDate,
      artist: artistData, // Use the object created above (or null)
      venue: venue,       // Use the object created above (or null)
      ticket_url: event.url || null,
      image_url: event.images?.find((img: any) => img.ratio === "16_9" && img.width > 500)?.url || null,
      artist_id: artistId, // Use the variable derived above (string | null)
      venue_id: venueId   // Use the variable derived above (string | null)
    };

    // --- Queue Show Sync Task ---
    // The background task will handle database persistence using the external ID
    await syncManager.enqueueTask({
      type: 'show',
      id: event.id, // Use the external event ID
      operation: 'create',
      priority: 'high',
      // Optionally pass payload if sync service needs hints
      // payload: { artist_external_id: artistId, venue_external_id: venueId }
    });
    console.log(`Queued sync task for show: ${showForDisplay.name} (ID: ${event.id})`);

    return showForDisplay; // Return the API-derived data

  } catch (error) {
    console.error("Show details fetch/sync error:", error);
    toast.error("Failed to load show details");
    // Depending on desired behavior, you might return null or re-throw
    return null;
    // throw error; // Re-throwing might be better if caller handles errors
  }
}
