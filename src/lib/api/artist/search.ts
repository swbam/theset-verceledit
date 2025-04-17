import { supabase } from "@/integrations/supabase/client";
import { Artist } from "@/lib/types";
import { searchArtistsWithEvents } from "@/lib/ticketmaster";
import { handleError, ErrorDetails, ErrorSource } from "@/lib/error-handling";

export async function searchArtists(query: string): Promise<{ artists: Artist[]; error?: string }> {
  try {
    // First check database for existing artists
    const { data: existingArtists, error: dbError } = await supabase
      .from('artists')
      .select('*')
      .ilike('name', `%${query}%`)
      .limit(10);

    if (dbError) {
      console.error('Database error searching artists:', dbError);
      handleError({
        message: dbError.message,
        source: ErrorSource.Database,
        originalError: dbError
      });
    }

    // If we found artists in the database, trigger background refresh
    if (existingArtists && existingArtists.length > 0) {
      console.log(`Found ${existingArtists.length} existing artists, triggering background refresh`);
      
      // Cast database results to Artist type
      const artists = existingArtists.map(artist => ({
        id: artist.id,
        name: artist.name,
        external_id: artist.external_id || undefined,
        image_url: artist.image_url,
        url: artist.url,
        spotify_id: artist.spotify_id,
        spotify_url: artist.spotify_url,
        setlist_fm_mbid: artist.setlist_fm_mbid,
        genres: artist.genres,
        popularity: artist.popularity,
        followers: artist.followers,
        ticketmaster_id: artist.ticketmaster_id,
        created_at: artist.created_at,
        updated_at: artist.updated_at
      })) as Artist[];
      
      // Trigger background refresh for each artist
      artists.forEach(artist => {
        if (artist.id) {
          supabase.functions.invoke('sync-artist', {
            body: { artistId: artist.id }
          }).catch(err => {
            console.error(`Error queuing background refresh for artist ${artist.id}:`, err);
          });
        }
      });

      return { artists };
    }

    // If no results in database or not enough, search Ticketmaster
    console.log('Searching Ticketmaster for artists:', query);
    const searchResults = await searchArtistsWithEvents(query);

    if (!searchResults || searchResults.length === 0) {
      return { artists: [] };
    }

    // Process each artist
    const processedArtists = await Promise.all(searchResults.map(async (artist) => {
      try {
        // Sync artist data
        const syncResult = await supabase.functions.invoke('sync-artist', {
          body: { 
            artistId: artist.id,
            payload: artist
          }
        });

        if (!syncResult.data?.success) {
          console.error(`Error syncing artist ${artist.name}:`, syncResult.error);
          return null;
        }

        return syncResult.data.data as Artist;
      } catch (error) {
        console.error(`Error processing artist ${artist.name}:`, error);
        return null;
      }
    }));

    // Filter out any failed syncs
    const validArtists = processedArtists.filter((artist): artist is Artist => artist !== null);

    return { artists: validArtists };

  } catch (error) {
    console.error('Error in searchArtists:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    handleError({
      message: errorMessage,
      source: ErrorSource.Unknown,
      originalError: error
    });
    return { artists: [], error: errorMessage };
  }
}

export async function searchSpotifyArtists(query: string): Promise<Artist[]> {
  try {
    // This is now handled by the sync-artist Edge Function
    // Just return empty array as this is being deprecated
    return [];
  } catch (error) {
    console.error('Error searching Spotify artists:', error);
    return [];
  }
}
