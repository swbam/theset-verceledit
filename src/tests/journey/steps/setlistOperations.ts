
import { supabase } from "@/integrations/supabase/client";
import { TestResults } from '../types';
import { logError, logSuccess } from '../logger';

/**
 * Step 5-6: Select a show and get/create its setlist
 */
export async function getOrCreateSetlist(
  results: TestResults, 
  show: any
): Promise<string> {
  console.log(`\n📍 STEP 5: Selecting show to view`);
  
  logSuccess(results, "Show Selection", `Selected show: ${show.name}`, {
    showId: show.id,
    showName: show.name,
    showDate: show.date,
    venueId: show.venue_id
  });
  
  // Step 6: Check or create setlist for the show
  console.log(`\n📍 STEP 6: Checking setlist for show: "${show.name}"`);
  
  try {
    const { data: existingSetlist, error: setlistError } = await supabase
      .from('setlists')
      .select('*')
      .eq('show_id', show.id)
      .maybeSingle();
    
    if (setlistError) {
      logError(results, "Setlist Check", "Database", `Database error checking setlist: ${setlistError.message}`, setlistError);
      throw setlistError;
    }
    
    let setlistId = existingSetlist?.id;
    
    if (!existingSetlist) {
      // Create new setlist
      console.log(`Creating new setlist for show: ${show.name}`);
      
      const { data: newSetlist, error: createError } = await supabase
        .from('setlists')
        .insert({
          show_id: show.id
        })
        .select()
        .single();
      
      if (createError) {
        logError(results, "Setlist Creation", "Database", `Database error creating setlist: ${createError.message}`, createError);
        throw createError;
      }
      
      setlistId = newSetlist.id;
      logSuccess(results, "Setlist Creation", `Created new setlist for show: ${show.name}`, {
        setlistId: setlistId
      });
    } else {
      logSuccess(results, "Setlist Check", `Found existing setlist for show: ${show.name}`, {
        setlistId: setlistId
      });
    }
    
    return setlistId;
  } catch (error) {
    logError(results, "Setlist", "Database", `Error with setlist operations: ${(error as Error).message}`, error);
    throw error;
  }
}

/**
 * Step 7: Check setlist songs and add songs if needed
 */
export async function manageSetlistSongs(
  results: TestResults, 
  setlistId: string, 
  tracks: any[]
): Promise<any[]> {
  console.log(`\n📍 STEP 7: Checking setlist songs`);
  
  try {
    // Using let instead of const to allow reassignment
    let { data: setlistSongs, error: songsError } = await supabase
      .from('setlist_songs')
      .select('*')
      .eq('setlist_id', setlistId);
    
    if (songsError) {
      logError(results, "Setlist Songs", "Database", `Database error fetching setlist songs: ${songsError.message}`, songsError);
      throw songsError;
    }
    
    if (!setlistSongs || setlistSongs.length === 0) {
      // Add some songs to the setlist
      console.log(`No songs in setlist. Adding 5 random tracks...`);
      
      // Shuffle tracks and pick 5 random ones
      const shuffledTracks = [...tracks].sort(() => 0.5 - Math.random());
      const selectedTracks = shuffledTracks.slice(0, 5);
      
      for (const track of selectedTracks) {
        const { error: addError } = await supabase
          .from('setlist_songs')
          .insert({
            setlist_id: setlistId,
            track_id: track.id
          });
        
        if (addError) {
          logError(results, "Add Setlist Song", "Database", `Error adding song "${track.name}" to setlist: ${addError.message}`, addError);
          throw addError;
        }
      }
      
      // Fetch the songs again
      const { data: updatedSongs, error: updatedError } = await supabase
        .from('setlist_songs')
        .select('*')
        .eq('setlist_id', setlistId);
      
      if (updatedError) {
        logError(results, "Updated Setlist Songs", "Database", `Database error fetching updated setlist songs: ${updatedError.message}`, updatedError);
        throw updatedError;
      }
      
      logSuccess(results, "Add Setlist Songs", `Added ${updatedSongs?.length || 0} songs to the setlist`, {
        songCount: updatedSongs?.length || 0,
        setlistId: setlistId
      });
      
      // Update our reference
      if (updatedSongs) {
        setlistSongs = updatedSongs;
      }
    } else {
      logSuccess(results, "Setlist Songs", `Found ${setlistSongs.length} songs in the setlist`, {
        songCount: setlistSongs.length,
        setlistId: setlistId
      });
    }
    
    return setlistSongs || [];
  } catch (error) {
    logError(results, "Setlist Songs", "Database", `Error managing setlist songs: ${(error as Error).message}`, error);
    throw error;
  }
}

/**
 * Step 8: Simulate voting for a song
 */
export async function voteForSong(
  results: TestResults, 
  setlistSongs: any[]
): Promise<void> {
  console.log(`\n📍 STEP 8: Simulating vote for a song`);
  
  try {
    if (setlistSongs && setlistSongs.length > 0) {
      const songToVoteFor = setlistSongs[0];
      
      // First check if we already voted for this song
      const { data: existingVote, error: voteCheckError } = await supabase
        .from('votes')
        .select('*')
        .eq('setlist_song_id', songToVoteFor.id)
        .eq('user_id', 'test-user-id') // Use a test user ID
        .maybeSingle();
      
      if (voteCheckError) {
        logError(results, "Vote Check", "Database", `Database error checking existing vote: ${voteCheckError.message}`, voteCheckError);
        // Continue anyway - this is just a test
      }
      
      if (!existingVote) {
        // Insert a new vote
        const { error: voteError } = await supabase
          .from('votes')
          .insert({
            setlist_song_id: songToVoteFor.id,
            user_id: 'test-user-id' // Use a test user ID
          });
        
        if (voteError) {
          logError(results, "Vote", "Database", `Database error voting for song: ${voteError.message}`, voteError);
          throw voteError;
        }
        
        // Increment the vote count
        const { error: incrementError } = await supabase.rpc(
          'increment_votes',
          { song_id: songToVoteFor.id }
        );
        
        if (incrementError) {
          logError(results, "Vote Increment", "Database", `Database error incrementing vote count: ${incrementError.message}`, incrementError);
          throw incrementError;
        }
        
        logSuccess(results, "Vote", `Successfully voted for song ID: ${songToVoteFor.id}`);
      } else {
        logSuccess(results, "Vote Check", `Already voted for song ID: ${songToVoteFor.id}`);
      }
    } else {
      logError(results, "Vote", "Client", "No songs available to vote for");
    }
  } catch (error) {
    logError(results, "Vote", "Database", `Error voting for song: ${(error as Error).message}`, error);
    throw error;
  }
}
