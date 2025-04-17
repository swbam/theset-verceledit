import { supabase } from "@/integrations/supabase/client";
import { searchArtistsWithEvents } from "@/lib/ticketmaster";
import { Artist, Show, Venue } from "@/lib/types";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const query = searchParams.get('query');

    if (!type || !query) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Missing required parameters: type, query'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    let results: any[] = [];

    switch (type) {
      case 'artist':
        // Search Ticketmaster for artists
        const artists = await searchArtistsWithEvents(query);
        if (artists && artists.length > 0) {
          // Process each artist through sync function
          const processedArtists = await Promise.all(artists.map(async (artist) => {
            try {
              const result = await supabase.functions.invoke('sync-artist', {
                body: { 
                  artistId: artist.id,
                  payload: artist
                }
              });

              if (!result.data?.success) {
                console.error(`Error syncing artist ${artist.name}:`, result.error);
                return null;
              }

              return result.data.data as Artist;
            } catch (error) {
              console.error(`Error processing artist ${artist.name}:`, error);
              return null;
            }
          }));

          // Filter out failed syncs
          results = processedArtists.filter(artist => artist !== null);
        }
        break;

      case 'venue':
        // Search for venues in database first
        const { data: venues, error: venueError } = await supabase
          .from('venues')
          .select('*')
          .ilike('name', `%${query}%`)
          .limit(10);

        if (venueError) {
          throw venueError;
        }

        // Process each venue
        if (venues && venues.length > 0) {
          const processedVenues = await Promise.all(venues.map(async (venue) => {
            try {
              const result = await supabase.functions.invoke('sync-venue', {
                body: { venueId: venue.id }
              });

              if (!result.data?.success) {
                console.error(`Error syncing venue ${venue.name}:`, result.error);
                return null;
              }

              return result.data.data as Venue;
            } catch (error) {
              console.error(`Error processing venue ${venue.name}:`, error);
              return null;
            }
          }));

          results = processedVenues.filter(venue => venue !== null);
        }
        break;

      case 'show':
        // Search for shows in database
        const { data: shows, error: showError } = await supabase
          .from('shows')
          .select(`
            *,
            artist:artists(*),
            venue:venues(*)
          `)
          .ilike('name', `%${query}%`)
          .limit(10);

        if (showError) {
          throw showError;
        }

        // Process each show
        if (shows && shows.length > 0) {
          const processedShows = await Promise.all(shows.map(async (show) => {
            try {
              const result = await supabase.functions.invoke('sync-show', {
                body: { showId: show.id }
              });

              if (!result.data?.success) {
                console.error(`Error syncing show ${show.name}:`, result.error);
                return null;
              }

              return result.data.data as Show;
            } catch (error) {
              console.error(`Error processing show ${show.name}:`, error);
              return null;
            }
          }));

          results = processedShows.filter(show => show !== null);
        }
        break;

      default:
        return new Response(JSON.stringify({
          success: false,
          error: `Invalid search type: ${type}`
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
    }

    return new Response(JSON.stringify({
      success: true,
      results
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('[API/search] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return new Response(JSON.stringify({
      success: false,
      error: 'Search failed',
      details: errorMessage
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
