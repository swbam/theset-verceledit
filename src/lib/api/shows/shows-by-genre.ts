import { supabase } from "@/integrations/supabase/client";
import { Show } from "@/lib/types";
import { fetchShowsByGenre as fetchShowsFromTicketmaster } from "@/lib/ticketmaster";

export async function getShowsByGenre(genre: string, limit: number = 10): Promise<Show[]> {
  try {
    // First try to get from database
    const { data: shows, error } = await supabase
      .from('shows')
      .select(`
        *,
        artist:artists(*),
        venue:venues(*)
      `)
      .eq('genre', genre)
      .gt('date', new Date().toISOString())
      .order('date', { ascending: true })
      .limit(limit);

    if (error) {
      console.error('[getShowsByGenre] Database error:', error);
      return [];
    }

    // If we have enough shows, return them
    if (shows && shows.length >= limit) {
      return shows as Show[];
    }

    // If not enough shows in database, fetch from Ticketmaster
    console.log(`[getShowsByGenre] Fetching additional shows for genre ${genre} from Ticketmaster`);
    const events = await fetchShowsFromTicketmaster(genre, limit);
    
    // Process each event
    await Promise.all(events.map(async (event) => {
      const { artist, venue, ...showData } = event;

      try {
        // 1. Sync Artist if available
        if (artist?.id) {
          console.log(`[getShowsByGenre] Syncing artist ${artist.name}`);
          const artistResult = await supabase.functions.invoke('sync-artist', {
            body: { artistId: artist.id }
          });

          if (!artistResult.data?.success) {
            console.error(`[getShowsByGenre] Artist sync failed:`, artistResult.error);
          }
        }

        // 2. Sync Venue if available
        if (venue?.id) {
          console.log(`[getShowsByGenre] Syncing venue ${venue.name}`);
          const venueResult = await supabase.functions.invoke('sync-venue', {
            body: { venueId: venue.id }
          });

          if (!venueResult.data?.success) {
            console.error(`[getShowsByGenre] Venue sync failed:`, venueResult.error);
          }
        }

        // 3. Sync Show
        console.log(`[getShowsByGenre] Syncing show ${showData.id}`);
        const showResult = await supabase.functions.invoke('sync-show', {
          body: { 
            showId: showData.id,
            payload: {
              ...showData,
              artist_id: artist?.id,
              venue_id: venue?.id,
              genre
            }
          }
        });

        if (!showResult.data?.success) {
          console.error(`[getShowsByGenre] Show sync failed:`, showResult.error);
        }

      } catch (error) {
        console.error(`[getShowsByGenre] Error processing show ${showData.id}:`, error);
      }
    }));

    // Get updated shows from database
    const { data: updatedShows, error: finalError } = await supabase
      .from('shows')
      .select(`
        *,
        artist:artists(*),
        venue:venues(*)
      `)
      .eq('genre', genre)
      .gt('date', new Date().toISOString())
      .order('date', { ascending: true })
      .limit(limit);

    if (finalError) {
      console.error('[getShowsByGenre] Error fetching final shows:', finalError);
      return [];
    }

    return updatedShows as Show[];

  } catch (error) {
    console.error('[getShowsByGenre] Error:', error);
    return [];
  }
}
