import { supabase } from '@/integrations/supabase/client';
import { Artist, Song } from '@/lib/types'; // Import Song type

// Define a type for the artist data combined with tracks
export type ArtistWithTracks = Artist & {
  top_tracks?: Song[];
};

/**
 * Fetches artist details and their top 10 tracks from the database.
 * Returns null if the artist is not found.
 */
export async function getArtist(artistId: string): Promise<ArtistWithTracks | null> {
  try {
    if (!artistId) {
      console.error("Missing artist ID");
      return null;
    }

    // 1. Fetch artist from DB
    const { data: dbArtist, error: dbError } = await supabase
      .from('artists')
      .select('*') // Select all artist fields
      .eq('id', artistId)
      .single(); // Use single() as we expect one artist for the ID

    if (dbError || !dbArtist) {
      if (dbError && dbError.code !== 'PGRST116') { // PGRST116 = 'Exact one row not found'
        console.error(`Error fetching artist ${artistId} from DB: ${dbError.message}`);
      } else {
        console.log(`Artist ${artistId} not found in DB.`);
      }
      return null; // Return null if not found or other error
    }

    // 2. Fetch associated top songs (top 10 by popularity)
    const { data: topTracks, error: tracksError } = await supabase
      .from('songs') // Query SONGS table
      .select('*') // Select all song fields
      .eq('artist_id', artistId)
      .order('popularity', { ascending: false, nullsFirst: false }) // Order by popularity
      .limit(10); // Limit to top 10

    if (tracksError) {
      console.warn(`Error fetching top tracks from DB for artist ${artistId}: ${tracksError.message}`);
      // Return artist data even if tracks fail, but with empty tracks array
      // Explicitly map fields to handle null -> undefined conversion for Artist type
      return {
        id: dbArtist.id, // Required
        name: dbArtist.name, // Required
        external_id: dbArtist.external_id ?? undefined,
        spotify_id: dbArtist.spotify_id ?? undefined,
        spotify_url: dbArtist.spotify_url ?? undefined,
        image_url: dbArtist.image_url ?? undefined,
        followers: dbArtist.followers ?? undefined,
        popularity: dbArtist.popularity ?? undefined,
        genres: dbArtist.genres ?? undefined, // Assuming array or null/undefined
        setlist_fm_mbid: dbArtist.setlist_fm_mbid ?? undefined,
        // setlist_fm_id: dbArtist.setlist_fm_id ?? undefined, // Removed - Field not in Artist type
        ticketmaster_id: dbArtist.ticketmaster_id ?? undefined,
        // tm_id: dbArtist.tm_id ?? undefined, // Removed - Field not in Artist type (uses ticketmaster_id)
        url: dbArtist.url ?? undefined,
        created_at: dbArtist.created_at ?? undefined,
        updated_at: dbArtist.updated_at ?? undefined,
        top_tracks: []
      };
    }

    // 3. Combine artist and tracks
    console.log(`Successfully fetched artist ${dbArtist.name} and ${topTracks?.length || 0} top tracks from DB.`);
    // Explicitly map fields to handle null -> undefined conversion for Artist type
    const finalArtistData: ArtistWithTracks = {
        id: dbArtist.id, // Required
        name: dbArtist.name, // Required
        external_id: dbArtist.external_id ?? undefined,
        spotify_id: dbArtist.spotify_id ?? undefined,
        spotify_url: dbArtist.spotify_url ?? undefined,
        image_url: dbArtist.image_url ?? undefined,
        followers: dbArtist.followers ?? undefined,
        popularity: dbArtist.popularity ?? undefined,
        genres: dbArtist.genres ?? undefined,
        setlist_fm_mbid: dbArtist.setlist_fm_mbid ?? undefined,
        // setlist_fm_id: dbArtist.setlist_fm_id ?? undefined, // Removed - Field not in Artist type
        ticketmaster_id: dbArtist.ticketmaster_id ?? undefined,
        // tm_id: dbArtist.tm_id ?? undefined, // Removed - Field not in Artist type (uses ticketmaster_id)
        url: dbArtist.url ?? undefined,
        created_at: dbArtist.created_at ?? undefined,
        updated_at: dbArtist.updated_at ?? undefined,
        top_tracks: topTracks || []
    };

    return finalArtistData;

  } catch (error) {
    console.error(`Unexpected error in getArtist: ${(error as Error).message}`);
    return null;
  }
}