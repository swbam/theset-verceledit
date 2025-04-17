import { supabase } from "@/integrations/supabase/client";
import { Show } from "@/lib/types";
import { fetchShowDetails as fetchShowFromTicketmaster } from "@/lib/ticketmaster";

export async function getShowDetails(showId: string): Promise<Show | null> {
  try {
    // First try to get from database
    const { data: show, error } = await supabase
      .from('shows')
      .select(`
        *,
        artist:artists(*),
        venue:venues(*)
      `)
      .eq('id', showId)
      .single();

    if (error) {
      console.error('[getShowDetails] Database error:', error);
      return null;
    }

    // If found in database, trigger background refresh and return
    if (show) {
      // Trigger background refresh
      supabase.functions.invoke('sync-show', {
        body: { showId }
      }).catch(error => {
        console.error(`[getShowDetails] Background sync failed for show ${showId}:`, error);
      });

      return show as Show;
    }

    // If not in database, fetch from Ticketmaster
    console.log(`[getShowDetails] Show ${showId} not found in database, fetching from Ticketmaster`);
    const event = await fetchShowFromTicketmaster(showId);
    if (!event) {
      console.log(`[getShowDetails] Show ${showId} not found in Ticketmaster`);
      return null;
    }

    // Process the fetched event
    const { artist, venue, ...showData } = event;

    // 1. Sync Artist if available
    if (artist?.id) {
      console.log(`[getShowDetails] Syncing artist ${artist.name}`);
      const artistResult = await supabase.functions.invoke('sync-artist', {
        body: { artistId: artist.id }
      });

      if (!artistResult.data?.success) {
        console.error(`[getShowDetails] Artist sync failed:`, artistResult.error);
      }
    }

    // 2. Sync Venue if available
    if (venue?.id) {
      console.log(`[getShowDetails] Syncing venue ${venue.name}`);
      const venueResult = await supabase.functions.invoke('sync-venue', {
        body: { venueId: venue.id }
      });

      if (!venueResult.data?.success) {
        console.error(`[getShowDetails] Venue sync failed:`, venueResult.error);
      }
    }

    // 3. Sync Show
    console.log(`[getShowDetails] Syncing show ${showId}`);
    const showResult = await supabase.functions.invoke('sync-show', {
      body: { 
        showId,
        payload: {
          ...showData,
          artist_id: artist?.id,
          venue_id: venue?.id
        }
      }
    });

    if (!showResult.data?.success) {
      console.error(`[getShowDetails] Show sync failed:`, showResult.error);
      return null;
    }

    // Return the synced show data
    return showResult.data.data as Show;

  } catch (error) {
    console.error('[getShowDetails] Error:', error);
    return null;
  }
}

export async function getUpcomingShows(limit: number = 10): Promise<Show[]> {
  try {
    const { data: shows, error } = await supabase
      .from('shows')
      .select(`
        *,
        artist:artists(*),
        venue:venues(*)
      `)
      .gt('date', new Date().toISOString())
      .order('date', { ascending: true })
      .limit(limit);

    if (error) throw error;
    return shows as Show[];

  } catch (error) {
    console.error('[getUpcomingShows] Error:', error);
    return [];
  }
}
