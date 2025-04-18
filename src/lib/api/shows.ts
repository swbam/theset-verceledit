import { supabase } from '@/integrations/supabase/client';
import { Show } from '@/lib/types';
import { callTicketmasterApi } from './ticketmaster-config';

export async function fetchShowDetails(showId: string): Promise<Show | null> {
  try {
    // Try to find show by id or external_id
    const { data: show, error } = await supabase
      .from('shows')
      .select(`
        *,
        artist:artists(*),
        venue:venues(*)
      `)
      .or(`id.eq.${showId},ticketmaster_id.eq.${showId}`)
      .single();

    if (error) throw error;

    // Trigger background sync
    supabase.functions.invoke('sync-show', {
      body: { showId }
    }).catch(error => {
      console.error(`Background sync failed for show ${showId}:`, error);
    });

    // Transform the database response to match our Show type
    if (!show) return null;
    
    return {
      ...show,
      ticketmaster_id: show.ticketmaster_id || undefined,
      artist: show.artist ? {
        id: show.artist.id,
        name: show.artist.name
      } : null,
      venue: show.venue ? {
        id: show.venue.id,
        name: show.venue.name,
        city: show.venue.city,
        state: show.venue.state
      } : null
    } as Show;
  } catch (error) {
    console.error('[API/shows] Error fetching show details:', error);
    return null;
  }
}

export async function fetchShowsByGenre(genre: string): Promise<Show[]> {
  try {
    const data = await callTicketmasterApi('events.json', {
      classificationName: 'music',
      genreId: genre,
      size: '20'
    });

    if (!data._embedded?.events) {
      return [];
    }

    return data._embedded.events.map((event: any) => ({
      id: event.id,
      name: event.name,
      date: event.dates.start.dateTime,
      venue: event._embedded?.venues?.[0] ? {
        id: event._embedded.venues[0].id,
        name: event._embedded.venues[0].name,
        city: event._embedded.venues[0].city?.name,
        state: event._embedded.venues[0].state?.name,
        country: event._embedded.venues[0].country?.name
      } : null,
      ticket_url: event.url,
      image_url: event.images?.find((img: any) => img.ratio === "16_9" && img.width > 500)?.url,
      artist_id: event._embedded?.attractions?.[0]?.id
    }));
  } catch (error) {
    console.error('[API/shows] Error fetching shows by genre:', error);
    return [];
  }
}

export async function saveShow(show: Show): Promise<{ success: boolean; error?: string; data?: Show }> {
  try {
    console.log(`[API/shows] Saving show ${show.id}`);

    // 1. Sync Artist if available
    if (show.artist_id) {
      console.log(`[API/shows] Syncing artist ${show.artist_id}`);
      const artistResult = await supabase.functions.invoke('sync-artist', {
        body: { artistId: show.artist_id }
      });

      if (!artistResult.data?.success) {
        console.error(`[API/shows] Artist sync failed:`, artistResult.error);
      }
    }

    // 2. Sync Venue if available
    if (show.venue_id) {
      console.log(`[API/shows] Syncing venue ${show.venue_id}`);
      const venueResult = await supabase.functions.invoke('sync-venue', {
        body: { venueId: show.venue_id }
      });

      if (!venueResult.data?.success) {
        console.error(`[API/shows] Venue sync failed:`, venueResult.error);
      }
    }

    // 3. Sync Show
    console.log(`[API/shows] Syncing show ${show.id}`);
    const showResult = await supabase.functions.invoke('sync-show', {
      body: { 
        showId: show.id,
        payload: show
      }
    });

    if (!showResult.data?.success) {
      throw new Error(showResult.error?.message || 'Show sync failed');
    }

    console.log(`[API/shows] Successfully synced show ${show.id}`);
    return { 
      success: true, 
      data: showResult.data.data 
    };

  } catch (error) {
    console.error('[API/shows] Error saving show:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

export async function saveShows(shows: Show[]): Promise<{ success: boolean; error?: string }> {
  try {
    console.log(`[API/shows] Saving ${shows.length} shows`);

    // Process shows in parallel with Promise.all
    await Promise.all(shows.map(async (show) => {
      try {
        await saveShow(show);
      } catch (error) {
        console.error(`[API/shows] Error saving show ${show.id}:`, error);
      }
    }));

    return { success: true };

  } catch (error) {
    console.error('[API/shows] Error saving shows:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

export async function getShowById(id: string): Promise<Show | null> {
  try {
    const { data: show, error } = await supabase
      .from('shows')
      .select(`
        *,
        artist:artists(*),
        venue:venues(*)
      `)
      .or(`id.eq.${id},ticketmaster_id.eq.${id}`)
      .single();

    if (error) throw error;
    if (!show) return null;

    // Trigger background refresh
    supabase.functions.invoke('sync-show', {
      body: { showId: id }
    }).catch(error => {
      console.error(`[API/shows] Background sync failed for show ${id}:`, error);
    });

    return show as Show;

  } catch (error) {
    console.error('[API/shows] Error fetching show:', error);
    return null;
  }
}

export async function getShowsByArtist(artistId: string): Promise<Show[]> {
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
    console.error('[API/shows] Error fetching artist shows:', error);
    return [];
  }
}
