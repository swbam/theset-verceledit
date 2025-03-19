
import { fetchAndSaveArtistShows } from "@/lib/api/artist/shows";
import { supabase } from "@/integrations/supabase/client";
import { TestResults } from '../types';
import { logError, logSuccess } from '../logger';

/**
 * Step 3: Get artist's upcoming shows
 */
export async function getArtistShows(
  results: TestResults, 
  artistId: string, 
  artistName: string
): Promise<any[]> {
  console.log(`\n📍 STEP 3: Fetching upcoming shows for artist: "${artistName}"`);
  
  try {
    await fetchAndSaveArtistShows(artistId);
    
    // Verify shows were saved to database
    const { data: shows, error: showsError } = await supabase
      .from('shows')
      .select('*')
      .eq('artist_id', artistId);
    
    if (showsError) {
      logError(results, "Upcoming Shows", "Database", `Database error fetching shows: ${showsError.message}`, showsError);
      throw showsError;
    }
    
    if (!shows || shows.length === 0) {
      logError(results, "Upcoming Shows", "Database", `No upcoming shows found for artist: ${artistName}`);
      throw new Error(`No upcoming shows found for artist: ${artistName}`);
    }
    
    logSuccess(results, "Upcoming Shows", `Found ${shows.length} upcoming shows for artist: ${artistName}`, {
      showCount: shows.length,
      firstShowId: shows[0].id,
      firstShowName: shows[0].name,
      firstShowDate: shows[0].date
    });
    
    return shows;
  } catch (error) {
    logError(results, "Upcoming Shows", "Database", `Error fetching shows: ${(error as Error).message}`, error);
    throw error;
  }
}
