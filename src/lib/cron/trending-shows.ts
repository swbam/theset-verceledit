import { supabase } from '@/lib/supabase';import { getRandomArtistSongs } from '@/lib/api/db/artist-utils';
import { createSetlistForShow } from '@/lib/api/db/show-utils';
import { addTracksToSetlist } from '@/lib/api/db/setlist-utils';
import { fetchTrendingShows } from '@/lib/ticketmaster';

/**
 * Pre-populates setlists for trending/popular shows
 * This helps avoid the slow initialization when users first visit a show page
 */
export async function populateTrendingShowsSetlists() {
  console.log("Starting trending shows setlist population...");
  
  try {
    // Get trending shows from our database
    const { data: trendingShows, error: showsError } = await supabase
      .from('shows')
      .select('id, artist_id')
      .order('date', { ascending: true })
      .gte('date', new Date().toISOString())
      .limit(20);
    
    if (showsError) {
      console.error("Error fetching trending shows:", showsError);
      return { success: false, error: showsError.message };
    }
    
    if (!trendingShows || trendingShows.length === 0) {
      console.log("No trending shows found, fetching from Ticketmaster...");
      
      // If no shows in database, fetch from Ticketmaster
      const externalShows = await fetchTrendingShows(10);
      
      if (!externalShows || externalShows.length === 0) {
        return { success: false, message: "No trending shows found" };
      }
      
      // Process these shows instead
      for (const show of externalShows) {
        await processShow(show.id, show.artist?.id);
      }
      
      return { 
        success: true, 
        message: `Processed ${externalShows.length} trending shows from Ticketmaster` 
      };
    }
    
    console.log(`Found ${trendingShows.length} trending shows in database`);
    
    // Process each show
    let processedCount = 0;
    let errorCount = 0;
    
    for (const show of trendingShows) {
      try {
        const result = await processShow(show.id, show.artist_id);
        if (result.success) {
          processedCount++;
        } else {
          errorCount++;
        }
      } catch (error) {
        console.error(`Error processing show ${show.id}:`, error);
        errorCount++;
      }
    }
    
    return { 
      success: true, 
      processedCount,
      errorCount,
      totalShows: trendingShows.length
    };
  } catch (error) {
    console.error("Error in populateTrendingShowsSetlists:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : String(error) 
    };
  }
}

/**
 * Process a single show - create setlist and add songs
 */
async function processShow(showId: string, artistId: string) {
  try {
    if (!showId || !artistId) {
      return { success: false, error: "Missing show ID or artist ID" };
    }
    
    console.log(`Processing show ${showId} for artist ${artistId}`);
    
    // Check if setlist already exists
    const { data: existingSetlist, error: checkError } = await supabase
      .from('setlists')
      .select('id')
      .eq('show_id', showId)
      .maybeSingle();
    
    if (checkError) {
      console.error(`Error checking setlist for show ${showId}:`, checkError);
      return { success: false, error: checkError.message };
    }
    
    // If setlist already exists, check if it has songs
    if (existingSetlist?.id) {
      console.log(`Setlist ${existingSetlist.id} already exists for show ${showId}`);
      
      // Check if setlist has songs
      const { data: songs, error: songsError } = await supabase
        .from('setlist_songs')
        .select('id')
        .eq('setlist_id', existingSetlist.id)
        .limit(1);
      
      if (songsError) {
        console.error(`Error checking songs for setlist ${existingSetlist.id}:`, songsError);
        return { success: false, error: songsError.message };
      }
      
      // If setlist already has songs, skip it
      if (songs && songs.length > 0) {
        console.log(`Setlist ${existingSetlist.id} already has songs, skipping`);
        return { success: true, message: "Setlist already populated" };
      }
      
      // If setlist exists but has no songs, add songs to it
      return await addSongsToSetlist(existingSetlist.id, artistId);
    }
    
    // If no setlist exists, create one
    console.log(`Creating new setlist for show ${showId}`);
    const setlistId = await createSetlistForShow({ id: showId, artist_id: artistId });
    
    if (!setlistId) {
      console.error(`Failed to create setlist for show ${showId}`);
      return { success: false, error: "Failed to create setlist" };
    }
    
    // Add songs to the new setlist
    return await addSongsToSetlist(setlistId, artistId);
  } catch (error) {
    console.error(`Error processing show ${showId}:`, error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : String(error) 
    };
  }
}

/**
 * Add random songs to a setlist
 */
async function addSongsToSetlist(setlistId: string, artistId: string) {
  try {
    console.log(`Adding songs to setlist ${setlistId} for artist ${artistId}`);
    
    // Get 5 random songs for the artist
    const randomSongs = await getRandomArtistSongs(artistId, 5);
    
    if (!randomSongs || randomSongs.length === 0) {
      console.error(`No songs found for artist ${artistId}`);
      return { success: false, error: "No songs found for artist" };
    }
    
    console.log(`Found ${randomSongs.length} random songs for artist ${artistId}`);
    
    // Prepare tracks for insertion
    const trackIds = randomSongs.map(song => song.id);
    const trackNames = randomSongs.reduce((acc, song) => {
      acc[song.id] = song.name;
      return acc;
    }, {} as Record<string, string>);
    
    // Add tracks to setlist
    await addTracksToSetlist(setlistId, trackIds, trackNames);
    
    console.log(`Successfully added ${randomSongs.length} songs to setlist ${setlistId}`);
    return { 
      success: true, 
      songsAdded: randomSongs.length 
    };
  } catch (error) {
    console.error(`Error adding songs to setlist ${setlistId}:`, error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : String(error) 
    };
  }
}
