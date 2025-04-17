import { supabase } from '@/integrations/supabase/client';
import { Show } from '@/lib/types';
import { fetchArtistEvents } from '@/lib/ticketmaster';

export async function fetchAndSaveArtistShows(artistId: string, artistName: string): Promise<{ success: boolean; shows?: Show[]; error?: string }> {
  try {
    console.log(`[fetchAndSaveArtistShows] Fetching shows for artist ${artistName} (${artistId})`);

    // 1. Fetch shows from Ticketmaster
    const shows = await fetchArtistEvents(artistId);
    if (!shows || shows.length === 0) {
      console.log(`[fetchAndSaveArtistShows] No shows found for artist ${artistName}`);
      return { success: true, shows: [] };
    }

    console.log(`[fetchAndSaveArtistShows] Found ${shows.length} shows for ${artistName}`);

    // 2. Process each show
    await Promise.all(shows.map(async (show) => {
      try {
        // Sync venue if available
        if (show.venue?.id) {
          console.log(`[fetchAndSaveArtistShows] Syncing venue ${show.venue.name}`);
          const venueResult = await supabase.functions.invoke('sync-venue', {
            body: { venueId: show.venue.id }
          });

          if (!venueResult.data?.success) {
            console.error(`[fetchAndSaveArtistShows] Venue sync failed for ${show.venue.name}:`, venueResult.error);
          }
        }

        // Sync show
        console.log(`[fetchAndSaveArtistShows] Syncing show ${show.name}`);
        const showResult = await supabase.functions.invoke('sync-show', {
          body: { 
            showId: show.id,
            payload: {
              ...show,
              artist_id: artistId
            }
          }
        });

        if (!showResult.data?.success) {
          console.error(`[fetchAndSaveArtistShows] Show sync failed for ${show.name}:`, showResult.error);
        }
      } catch (error) {
        console.error(`[fetchAndSaveArtistShows] Error processing show ${show.name}:`, error);
      }
    }));

    return { success: true, shows };

  } catch (error) {
    console.error(`[fetchAndSaveArtistShows] Error fetching/saving shows for ${artistName}:`, error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export async function getArtistShows(artistId: string): Promise<Show[]> {
  try {
    const { data: shows, error } = await supabase
      .from('shows')
      .select(`
        *,
        artist:artists(*),
        venue:venues(*)
      `)
      .eq('artist_id', artistId)
      .order('date', { ascending: true });

    if (error) throw error;
    return shows as Show[];

  } catch (error) {
    console.error('[getArtistShows] Error fetching shows:', error);
    return [];
  }
}
