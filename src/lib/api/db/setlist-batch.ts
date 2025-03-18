import { supabase } from "@/integrations/supabase/client";
import { getRandomArtistSongs } from "./artist-utils";
import { createSetlist, addTracksToSetlist } from "./setlist-utils";
import { toast } from "sonner";

/**
 * Pre-create setlists for popular shows that don't already have them
 * This helps avoid the "Creating setlist..." message for users
 */
export async function batchCreateSetlistsForPopularShows(): Promise<{ 
  processed: number, 
  created: number, 
  errors: string[] 
}> {
  console.log("Starting batch creation of setlists for popular shows");
  const result = { processed: 0, created: 0, errors: [] };
  
  try {
    // Fetch popular shows without setlists
    // We'll define "popular" as:
    // 1. Shows happening in the next 30 days
    // 2. Shows for artists with higher popularity scores
    // 3. Shows with the most views or interaction
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    
    // First, get shows in the next 30 days that don't have setlists yet
    const { data: showsWithoutSetlists, error: showsError } = await supabase
      .from('shows')
      .select(`
        id, 
        name,
        date,
        artist_id,
        venue_id,
        artists(name, popularity)
      `)
      .lt('date', thirtyDaysFromNow.toISOString())
      .not('id', 'in', (subquery) => 
        subquery
          .from('setlists')
          .select('show_id')
      )
      .order('date', { ascending: true })
      .limit(100);
    
    if (showsError) {
      result.errors.push(`Error fetching shows: ${showsError.message}`);
      return result;
    }
    
    if (!showsWithoutSetlists || showsWithoutSetlists.length === 0) {
      console.log("No shows without setlists found");
      return result;
    }
    
    console.log(`Found ${showsWithoutSetlists.length} shows without setlists`);
    
    // Sort shows by artist popularity (if available) to prioritize popular artists
    const sortedShows = showsWithoutSetlists.sort((a, b) => {
      const aPopularity = a.artists?.popularity || 0;
      const bPopularity = b.artists?.popularity || 0;
      return bPopularity - aPopularity;
    });
    
    // Process each show
    for (const show of sortedShows) {
      result.processed++;
      
      try {
        // Check if the show already has a setlist (double-check to prevent race conditions)
        const { data: existingSetlist } = await supabase
          .from('setlists')
          .select('id')
          .eq('show_id', show.id)
          .maybeSingle();
        
        if (existingSetlist?.id) {
          console.log(`Show ${show.id} already has setlist ${existingSetlist.id}, skipping`);
          continue;
        }
        
        // Create a setlist for this show
        const setlistId = await createSetlist(show.id, 'system');
        
        if (!setlistId) {
          result.errors.push(`Failed to create setlist for show ${show.id}`);
          continue;
        }
        
        // Get 5 random songs for this artist
        const randomSongs = await getRandomArtistSongs(show.artist_id, 5);
        
        if (!randomSongs || randomSongs.length === 0) {
          console.warn(`No songs found for artist ${show.artist_id}`);
          // The setlist exists, but is empty - still counts as created
          result.created++;
          continue;
        }
        
        // Add the songs to the setlist
        const trackIds = randomSongs.map(song => song.id);
        const trackNames = randomSongs.reduce((acc, song) => {
          acc[song.id] = song.name;
          return acc;
        }, {} as Record<string, string>);
        
        await addTracksToSetlist(setlistId, trackIds, trackNames);
        console.log(`Added ${trackIds.length} tracks to setlist ${setlistId} for show ${show.id}`);
        
        result.created++;
      } catch (error) {
        console.error(`Error processing show ${show.id}:`, error);
        result.errors.push(`Error processing show ${show.id}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    
    console.log(`Finished batch creation: processed ${result.processed} shows, created ${result.created} setlists, ${result.errors.length} errors`);
    return result;
  } catch (error) {
    console.error("Error in batch creation:", error);
    result.errors.push(`Batch creation error: ${error instanceof Error ? error.message : String(error)}`);
    return result;
  }
}

/**
 * Create setlists for specific shows, useful for targeted batches like homepage features
 */
export async function createSetlistsForSpecificShows(showIds: string[]): Promise<{ 
  processed: number, 
  created: number, 
  errors: string[] 
}> {
  console.log(`Creating setlists for ${showIds.length} specific shows`);
  const result = { processed: 0, created: 0, errors: [] };
  
  try {
    if (!showIds.length) {
      return result;
    }
    
    // Fetch shows that don't already have setlists
    const { data: shows, error: showsError } = await supabase
      .from('shows')
      .select(`
        id, 
        name,
        artist_id
      `)
      .in('id', showIds)
      .not('id', 'in', (subquery) => 
        subquery
          .from('setlists')
          .select('show_id')
      );
    
    if (showsError) {
      result.errors.push(`Error fetching specific shows: ${showsError.message}`);
      return result;
    }
    
    if (!shows || shows.length === 0) {
      console.log("All specified shows already have setlists");
      return result;
    }
    
    console.log(`Found ${shows.length} shows without setlists out of ${showIds.length} requested`);
    
    // Process each show
    for (const show of shows) {
      result.processed++;
      
      try {
        // Create a setlist for this show
        const setlistId = await createSetlist(show.id, 'system');
        
        if (!setlistId) {
          result.errors.push(`Failed to create setlist for show ${show.id}`);
          continue;
        }
        
        // Get 5 random songs for this artist
        const randomSongs = await getRandomArtistSongs(show.artist_id, 5);
        
        if (!randomSongs || randomSongs.length === 0) {
          console.warn(`No songs found for artist ${show.artist_id}`);
          // The setlist exists but is empty - still counts as created
          result.created++;
          continue;
        }
        
        // Add the songs to the setlist
        const trackIds = randomSongs.map(song => song.id);
        const trackNames = randomSongs.reduce((acc, song) => {
          acc[song.id] = song.name;
          return acc;
        }, {} as Record<string, string>);
        
        await addTracksToSetlist(setlistId, trackIds, trackNames);
        console.log(`Added ${trackIds.length} tracks to setlist ${setlistId} for show ${show.id}`);
        
        result.created++;
      } catch (error) {
        console.error(`Error processing show ${show.id}:`, error);
        result.errors.push(`Error processing show ${show.id}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    
    return result;
  } catch (error) {
    console.error("Error creating setlists for specific shows:", error);
    result.errors.push(`Error: ${error instanceof Error ? error.message : String(error)}`);
    return result;
  }
}

/**
 * Pre-create setlists for upcoming shows of a specific artist
 * Useful when an artist page is heavily trafficked
 */
export async function createSetlistsForArtist(artistId: string): Promise<{ 
  processed: number, 
  created: number, 
  errors: string[] 
}> {
  console.log(`Creating setlists for upcoming shows of artist ${artistId}`);
  const result = { processed: 0, created: 0, errors: [] };
  
  try {
    // Fetch upcoming shows for this artist
    const { data: shows, error: showsError } = await supabase
      .from('shows')
      .select(`
        id, 
        name,
        artist_id
      `)
      .eq('artist_id', artistId)
      .gte('date', new Date().toISOString())
      .not('id', 'in', (subquery) => 
        subquery
          .from('setlists')
          .select('show_id')
      )
      .order('date', { ascending: true });
    
    if (showsError) {
      result.errors.push(`Error fetching artist shows: ${showsError.message}`);
      return result;
    }
    
    if (!shows || shows.length === 0) {
      console.log(`No upcoming shows without setlists found for artist ${artistId}`);
      return result;
    }
    
    console.log(`Found ${shows.length} upcoming shows without setlists for artist ${artistId}`);
    
    // Get random songs for this artist (fetch once for all shows of this artist)
    const randomSongs = await getRandomArtistSongs(artistId, 5);
    
    if (!randomSongs || randomSongs.length === 0) {
      console.warn(`No songs found for artist ${artistId}`);
      // We'll still create empty setlists
    }
    
    // Process each show
    for (const show of shows) {
      result.processed++;
      
      try {
        // Create a setlist for this show
        const setlistId = await createSetlist(show.id, 'system');
        
        if (!setlistId) {
          result.errors.push(`Failed to create setlist for show ${show.id}`);
          continue;
        }
        
        if (randomSongs && randomSongs.length > 0) {
          // Add the songs to the setlist
          const trackIds = randomSongs.map(song => song.id);
          const trackNames = randomSongs.reduce((acc, song) => {
            acc[song.id] = song.name;
            return acc;
          }, {} as Record<string, string>);
          
          await addTracksToSetlist(setlistId, trackIds, trackNames);
          console.log(`Added ${trackIds.length} tracks to setlist ${setlistId} for show ${show.id}`);
        }
        
        result.created++;
      } catch (error) {
        console.error(`Error processing show ${show.id}:`, error);
        result.errors.push(`Error processing show ${show.id}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    
    return result;
  } catch (error) {
    console.error(`Error creating setlists for artist ${artistId}:`, error);
    result.errors.push(`Error: ${error instanceof Error ? error.message : String(error)}`);
    return result;
  }
} 