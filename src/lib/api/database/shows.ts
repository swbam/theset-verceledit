import { supabase } from '@/integrations/supabase/client';
import { Show, Artist, Venue } from '@/lib/types';

/**
 * Save a show to the database (insert or update)
 */
export async function saveShow(show: Partial<Show>) {
    // Add check for show.name as it's NOT NULL in the DB
    if (!show || !show.id || !show.name) {
      console.error("Missing show data, ID, or name for saving");
      return null;
    }

    console.log(`Saving show to database: ${show.name} (ID: ${show.id})`);

    try {
      const { data: dbShow, error: checkError } = await supabase
        .from('shows')
        .select('id, updated_at')
        .eq('id', show.id)
        .maybeSingle();

      if (checkError) {
          console.error(`Error checking for existing show: ${checkError.message}`);
          return null;
      }

      const showDataForUpsert = {
        id: show.id,
        name: show.name,
        artist_id: show.artist_id || null,
        venue_id: show.venue_id || null,
        date: show.date || null,
        image_url: show.image_url || null,
        ticket_url: (show as any).ticket_url || null,
        url: show.url || null,
        status: show.status || null, // Use null if undefined
        ticketmaster_id: show.ticketmaster_id || null,
        updated_at: new Date().toISOString(),
        ...( !dbShow && { created_at: show.created_at || new Date().toISOString() } )
      };

      const { data: savedShow, error: upsertError } = await supabase
        .from('shows')
        .upsert(showDataForUpsert, { onConflict: 'id' })
        .select()
        .single();

      if (upsertError) {
        console.error(`Error saving show ${show.id}:`, upsertError);
        return null;
      }

      console.log(`Successfully saved show ${savedShow?.id}`);
      return savedShow as Show;

    } catch (error) {
      console.error(`Unexpected error in saveShow: ${(error as Error).message}`);
      return null;
    }
}

// --- Stricter Types for Component Props ---
// Type matching ShowHeroProps['show']
type ShowForHero = {
  id: string;
  date: string;
  name?: string | undefined; // Optional string
  image_url?: string | undefined; // Optional string
  ticketmaster_id?: string | undefined; // Ticketmaster ID
  artist: {
    id: string;
    name: string;
    image_url?: string | undefined; // Optional string
  };
  venue: {
    id: string;
    name: string;
    city?: string | undefined; // Optional string
    state?: string | undefined; // Optional string
    country?: string | undefined; // Optional string
  };
  url?: string | undefined; // Show URL
};

// Type matching ShowInfoProps['show'] (assuming similar requirements)
type ShowForInfo = {
  id: string;
  date: string;
  time?: string | undefined;
  name?: string | undefined;
  status?: string | undefined;
  attendance?: number | undefined;
  external_url?: string | undefined;
  artist: {
    id: string;
    name: string;
  };
  venue: {
    id: string;
    name: string;
    city?: string | undefined;
    state?: string | undefined;
    country?: string | undefined;
    address?: string | undefined;
  };
};
// --- End Stricter Types ---


/**
 * Get details for a single show by ID, formatted for display components.
 * Returns null if the show is not found, or if essential data (date, artist, venue) is missing.
 */
export async function getShow(showId: string): Promise<ShowForHero | null> { // Return type matches ShowHero
  try {
    if (!showId) {
      console.error("Missing show ID");
      return null;
    }

    // 1. Fetch basic show details
    const { data: showResult, error: showError } = await supabase
      .from('shows')
      .select(`
        id, name, date, image_url, venue_id, artist_id, url, status, ticketmaster_id, ticket_url
      `)
      .eq('id', showId)
      .maybeSingle();

    if (showError || !showResult) {
      // Handle error or not found
      return null;
    }

    // Check for required date early
    if (!showResult.date) {
        console.warn(`Show ${showId} found but is missing a required date. Returning null.`);
        return null;
    }

    // 2. Fetch related venue details (must exist)
    if (!showResult.venue_id) {
        console.warn(`Show ${showId} is missing required venue_id. Returning null.`);
        return null;
    }
    const { data: venueResult, error: venueError } = await supabase
      .from('venues')
      .select(`id, name, city, state, country, address, image_url`) // Select needed fields
      .eq('id', showResult.venue_id)
      .single(); // Use single, expect it to exist

    if (venueError || !venueResult) {
        console.warn(`Required venue ${showResult.venue_id} not found for show ${showId}. Returning null. Error: ${venueError?.message}`);
        return null;
    }

    // 3. Fetch related artist details (must exist)
     if (!showResult.artist_id) {
        console.warn(`Show ${showId} is missing required artist_id. Returning null.`);
        return null;
    }
    const { data: artistResult, error: artistError } = await supabase
      .from('artists')
      .select(`id, name, image_url`) // Select needed fields
      .eq('id', showResult.artist_id)
      .single(); // Use single, expect it to exist

    if (artistError || !artistResult) {
        console.warn(`Required artist ${showResult.artist_id} not found for show ${showId}. Returning null. Error: ${artistError?.message}`);
        return null;
    }

    // 4. Construct the final object conforming to ShowForHero
    // Perform null -> undefined conversions where needed by the target type
    const finalShowData: ShowForHero = {
      id: showResult.id, // Known non-null
      date: showResult.date, // Known non-null
      name: showResult.name ?? undefined, // Use ?? for null/undefined -> undefined
      image_url: showResult.image_url ?? undefined,
      external_url: showResult.url ?? showResult.ticket_url ?? undefined, // Combine URL sources
      artist: {
        id: artistResult.id, // Known non-null
        name: artistResult.name, // Known non-null
        image_url: artistResult.image_url ?? undefined,
      },
      venue: {
        id: venueResult.id, // Known non-null
        name: venueResult.name, // Known non-null
        city: venueResult.city ?? undefined,
        state: venueResult.state ?? undefined,
        country: venueResult.country ?? undefined,
        // Note: ShowForHero doesn't need address, ShowForInfo does.
        // If ShowInfo needs different fields, adjust its type and this mapping.
      },
      // Add fields needed only by ShowForInfo if necessary, or create a separate function/type
      // status: showResult.status ?? undefined,
    };

    // Validate that the constructed object matches the target type (optional runtime check)
    // console.log("Final Show Data:", finalShowData);

    return finalShowData;

  } catch (error) {
    console.error(`Error in getShow: ${(error as Error).message}`);
    return null;
  }
}


/**
 * Get upcoming shows, ordered by date
 */
export async function getUpcomingShows(limit = 10) {
  try {
    const today = new Date().toISOString();
    const { data, error } = await supabase
      .from('shows')
      .select(`
        id, name, date, image_url,
        artists (id, name),
        venues (id, name, city, state)
      `)
      .gte('date', today)
      .order('date', { ascending: true })
      .limit(limit);

    if (error) {
      console.error("Error fetching upcoming shows:", error);
      return [];
    }
    // TODO: Map data if needed to match specific component prop types
    return data || [];
  } catch (error) {
    console.error(`Error in getUpcomingShows: ${(error as Error).message}`);
    return [];
  }
}

/**
 * Get past shows for a specific artist, ordered by date descending
 */
export async function getArtistPastShows(artistId: string, limit = 10) {
    try {
        if (!artistId) {
            console.error("Missing artist ID for getArtistPastShows");
            return [];
        }
        const today = new Date().toISOString();
        const { data, error } = await supabase
            .from('shows')
            .select(`
                id, name, date, image_url,
                artists!inner (id, name),
                venues (id, name, city, state)
            `)
            .eq('artist_id', artistId)
            .lt('date', today)
            .order('date', { ascending: false })
            .limit(limit);

        if (error) {
            console.error(`Error fetching past shows for artist ${artistId}:`, error);
            return [];
        }
        // TODO: Map data if needed
        return data || [];
    } catch (error) {
        console.error(`Error in getArtistPastShows: ${(error as Error).message}`);
        return [];
    }
}
