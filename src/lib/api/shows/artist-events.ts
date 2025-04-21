type Venue = {
  id: string;
  name: string;
  city: string | null;
  state: string | null;
  country: string | null;
};

import { Show } from '@/lib/types';

interface SupabaseShow {
  id: string;
  name: string;
  date: string | null;
  ticket_url: string | null;
  image_url: string | null;
  artist_id: string | null;
  ticketmaster_id: string | null;
  venue_id: string | null;
  venues: {
    id: string;
    name: string;
    city: string | null;
    state: string | null;
    country: string | null;
  } | null;
}

export interface ArtistEvent {
  id: string;
  name: string;
  date: string;
  url?: string | null;
  venue_id?: string | null;
  venue_name?: string | null;
  venue_city?: string | null;
  venue_state?: string | null;
  venue_country?: string | null;
  venue_ticketmaster_id?: string | null;
  image_url?: string | null;
  ticket_url?: string | null;
  ticketmaster_id?: string | null;
}

import { supabase } from "@/integrations/supabase/client";
import { callTicketmasterApi } from "../ticketmaster-config";

/**
 * Fetch upcoming shows for an artist
 */
export async function fetchArtistEvents(artistIdentifier: string): Promise<Show[]> {
  try {
    console.log(`Fetching events for artist ID: ${artistIdentifier}`);
    
    // First try to get shows from Supabase
    const { data: supabaseShows } = await supabase
      .from('shows')
      .select(`
        id,
        name,
        date,
        ticket_url,
        image_url,
        artist_id,
        ticketmaster_id,
        venue_id,
        venues(id, name, city, state, country)
      `)
      .eq('artist_id', artistIdentifier)
      .gt('date', new Date().toISOString())
      .order('date', { ascending: true });
    
    if (supabaseShows && supabaseShows.length > 0) {
      console.log(`Found ${supabaseShows.length} shows in database for artist ID: ${artistIdentifier}`);
      
      // Transform the data to match the expected format
      const shows: Show[] = supabaseShows.map((show: SupabaseShow) => ({
        id: show.id,
        name: show.name,
        date: show.date || new Date().toISOString(),
        artist_id: show.artist_id || artistIdentifier,
        venue_id: show.venue_id || '', // Required by type
        ticketmaster_id: show.ticketmaster_id,
        ticket_url: show.ticket_url || null,
        image_url: show.image_url,
        status: undefined,
        url: undefined,
        venue: show.venues ? {
          id: show.venues.id,
          name: show.venues.name,
          city: show.venues.city,
          state: show.venues.state
        } : null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }));
      
      // Trigger a background sync to refresh the data
      try {
        await supabase.functions.invoke('unified-sync', {
          body: {
            entityType: 'artist',
            entityId: artistIdentifier,
            options: {
              skipDependencies: false,
              forceRefresh: true
            }
          }
        });
      } catch (syncError) {
        console.error(`Background sync failed for artist ${artistIdentifier}:`, syncError);
      }
      
      return shows;
    }
    
    // If no shows in database, fetch from Ticketmaster API
    console.log(`No shows found in database, fetching from Ticketmaster for artist ID: ${artistIdentifier}`);
    
    // Determine search parameter based on ID format
    let searchParam: any = {};
    let ticketmasterId: string | null = null;
    
    // Check if it's a Ticketmaster ID (usually starts with K or G)
    if (/^[KG]\d/.test(artistIdentifier)) {
      // Ticketmaster ID
      searchParam = { attractionId: artistIdentifier };
      ticketmasterId = artistIdentifier;
    } else {
      // First try to get the artist from Supabase to get their Ticketmaster ID
      const { data: artist } = await supabase
        .from('artists')
        .select('ticketmaster_id, name')
        .eq('id', artistIdentifier)
        .single();

      if (artist?.ticketmaster_id) {
        searchParam = { attractionId: artist.ticketmaster_id };
        ticketmasterId = artist.ticketmaster_id;
      } else if (artist?.name) {
        searchParam = { keyword: artist.name };
      } else {
        // Fallback to using the ID as a keyword
        searchParam = { keyword: artistIdentifier };
      }
    }
    
    console.log(`Fetching from Ticketmaster API with params:`, searchParam);
    
    // Fetch from Ticketmaster API with increased size to get all shows
    const data = await callTicketmasterApi('events.json', {
      ...searchParam,
      segmentName: 'Music',
      sort: 'date,asc',
      size: '100' // Increased from 20 to 100 to get more shows
    });

    if (!data || !data._embedded?.events) {
      console.log(`No events found for artist ID: ${artistIdentifier}`);
      return [];
    }

    console.log(`Found ${data._embedded.events.length} events from Ticketmaster for artist ID: ${artistIdentifier}`);
    
    const shows: Show[] = data._embedded.events.map((event: any) => {
      // Get artist info from the event
      let artistId = '';
      
      if (event._embedded?.attractions && event._embedded.attractions.length > 0) {
        const attraction = event._embedded.attractions[0];
        artistId = attraction.id;
      } else {
        // Fallback to using the provided artist ID
        artistId = ticketmasterId || artistIdentifier;
      }
      
      // Process venue
      let venue: Venue | null = null;
      let venueId = null;
      if (event._embedded?.venues?.[0]) {
        const venueData = event._embedded.venues[0];
        venue = {
          id: venueData.id,
          name: venueData.name,
          city: venueData.city?.name ?? null,
          state: venueData.state?.name ?? null,
          country: venueData.country?.name ?? null,
        };
        venueId = venueData.id;
      }
      
      // Create show object
      return {
        id: event.id,
        name: event.name,
        date: event.dates.start.dateTime || new Date().toISOString(),
        artist_id: artistId,
        venue_id: venueId || '', // Required by type
        ticketmaster_id: event.id,
        venue_ticketmaster_id: venueId,
        ticket_url: event.url || null,
        image_url: event.images?.find((img: any) => img.ratio === "16_9" && img.width > 500)?.url,
        status: event.dates?.status?.code,
        url: event.url || null,
        venue: venue ? {
          id: venue.id,
          name: venue.name,
          city: venue.city,
          state: venue.state
        } : null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
    });

      // Queue a background sync to save these shows to the database
      if (shows.length > 0) {
        try {
          await supabase.functions.invoke('unified-sync', {
            body: {
              entityType: 'artist',
              entityId: artistIdentifier,
              ticketmasterId: ticketmasterId,
              options: {
                skipDependencies: false,
                forceRefresh: true
              }
            }
          });
        } catch (syncError) {
          console.error(`Background sync failed for artist ${artistIdentifier}:`, syncError);
        }
      }

    return shows;
  } catch (error) {
    console.error("Error fetching artist events:", error);
    return [];
  }
}
