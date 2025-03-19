
import { toast } from "sonner";
import { searchArtistsWithEvents } from "@/lib/api/artist/search";
import { fetchArtistById } from "@/lib/api/artist/fetch";
import { fetchAndSaveArtistShows } from "@/lib/api/artist/shows";
import { getArtistByName, getArtistAllTracks } from "@/lib/spotify";
import { supabase } from "@/integrations/supabase/client";

// Configuration
const TEST_ARTIST_NAME = "Taylor Swift";
const DETAILED_LOGGING = true;

// Error tracking
interface ErrorLog {
  step: string;
  source: "API" | "Database" | "Client";
  message: string;
  timestamp: Date;
  details?: any;
}

// Success tracking
interface SuccessLog {
  step: string;
  message: string;
  timestamp: Date;
  details?: any;
}

// Test results
interface TestResults {
  startTime: Date;
  endTime: Date | null;
  errors: ErrorLog[];
  successes: SuccessLog[];
  completed: boolean;
}

/**
 * Comprehensive test to simulate the complete user journey
 */
export async function runUserJourneyTest(): Promise<TestResults> {
  const results: TestResults = {
    startTime: new Date(),
    endTime: null,
    errors: [],
    successes: [],
    completed: false
  };

  // Helper functions for logging
  const logError = (step: string, source: "API" | "Database" | "Client", message: string, details?: any) => {
    const error: ErrorLog = {
      step,
      source,
      message,
      timestamp: new Date(),
      details
    };
    
    results.errors.push(error);
    
    if (DETAILED_LOGGING) {
      console.error(`❌ ERROR at ${step} (${source}): ${message}`, details || '');
    }
    
    return error;
  };

  const logSuccess = (step: string, message: string, details?: any) => {
    const success: SuccessLog = {
      step,
      message,
      timestamp: new Date(),
      details
    };
    
    results.successes.push(success);
    
    if (DETAILED_LOGGING) {
      console.log(`✅ SUCCESS at ${step}: ${message}`, details || '');
    }
    
    return success;
  };

  try {
    console.log(`🧪 Starting User Journey Test: ${TEST_ARTIST_NAME}`);
    console.log('---------------------------------------------');

    // Step 1: Search for an artist
    console.log(`\n📍 STEP 1: Searching for artist: "${TEST_ARTIST_NAME}"`);
    try {
      const artists = await searchArtistsWithEvents(TEST_ARTIST_NAME);
      
      if (!artists || artists.length === 0) {
        logError("Artist Search", "API", `No artists found for query: ${TEST_ARTIST_NAME}`);
        throw new Error(`No artists found for query: ${TEST_ARTIST_NAME}`);
      }
      
      logSuccess("Artist Search", `Found ${artists.length} artists matching "${TEST_ARTIST_NAME}"`, {
        artistCount: artists.length,
        firstArtistId: artists[0].id,
        firstArtistName: artists[0].name
      });
      
      // Step 2: Get artist details for the first result
      const selectedArtist = artists[0];
      console.log(`\n📍 STEP 2: Fetching details for artist: "${selectedArtist.name}" (ID: ${selectedArtist.id})`);
      
      try {
        const artistDetails = await fetchArtistById(selectedArtist.id);
        
        if (!artistDetails) {
          logError("Artist Details", "API", `Failed to fetch details for artist: ${selectedArtist.name}`);
          throw new Error(`Failed to fetch details for artist: ${selectedArtist.name}`);
        }
        
        logSuccess("Artist Details", `Successfully fetched details for artist: ${artistDetails.name}`, {
          id: artistDetails.id,
          name: artistDetails.name,
          spotifyId: artistDetails.spotify_id || "Not available",
          upcomingShows: artistDetails.upcoming_shows || 0
        });
        
        // Step 3: Get artist's upcoming shows
        console.log(`\n📍 STEP 3: Fetching upcoming shows for artist: "${artistDetails.name}"`);
        
        try {
          await fetchAndSaveArtistShows(artistDetails.id);
          
          // Verify shows were saved to database
          const { data: shows, error: showsError } = await supabase
            .from('shows')
            .select('*')
            .eq('artist_id', artistDetails.id);
          
          if (showsError) {
            logError("Upcoming Shows", "Database", `Database error fetching shows: ${showsError.message}`, showsError);
            throw showsError;
          }
          
          if (!shows || shows.length === 0) {
            logError("Upcoming Shows", "Database", `No upcoming shows found for artist: ${artistDetails.name}`);
            throw new Error(`No upcoming shows found for artist: ${artistDetails.name}`);
          }
          
          logSuccess("Upcoming Shows", `Found ${shows.length} upcoming shows for artist: ${artistDetails.name}`, {
            showCount: shows.length,
            firstShowId: shows[0].id,
            firstShowName: shows[0].name,
            firstShowDate: shows[0].date
          });
          
          // Step 4: Get artist's tracks
          console.log(`\n📍 STEP 4: Fetching tracks for artist: "${artistDetails.name}"`);
          
          let tracks = [];
          // First check if there are stored tracks
          if (artistDetails.stored_tracks && Array.isArray(artistDetails.stored_tracks)) {
            tracks = artistDetails.stored_tracks;
            logSuccess("Artist Tracks", `Using ${tracks.length} stored tracks for artist: ${artistDetails.name}`);
          } else if (artistDetails.spotify_id) {
            // If no stored tracks but we have Spotify ID, fetch from Spotify
            try {
              const tracksData = await getArtistAllTracks(artistDetails.spotify_id);
              
              if (!tracksData || !tracksData.tracks || tracksData.tracks.length === 0) {
                logError("Artist Tracks", "API", `No tracks found on Spotify for artist: ${artistDetails.name}`);
                throw new Error(`No tracks found on Spotify for artist: ${artistDetails.name}`);
              }
              
              tracks = tracksData.tracks;
              logSuccess("Artist Tracks", `Fetched ${tracks.length} tracks from Spotify for artist: ${artistDetails.name}`);
            } catch (spotifyError) {
              logError("Artist Tracks", "API", `Error fetching tracks from Spotify: ${(spotifyError as Error).message}`, spotifyError);
              throw spotifyError;
            }
          } else {
            logError("Artist Tracks", "Client", `No stored tracks and no Spotify ID available for artist: ${artistDetails.name}`);
            throw new Error(`No stored tracks and no Spotify ID available for artist: ${artistDetails.name}`);
          }
          
          // Step 5: Select a show to view
          console.log(`\n📍 STEP 5: Selecting show to view`);
          
          const selectedShow = shows[0]; // Select the first show
          
          logSuccess("Show Selection", `Selected show: ${selectedShow.name}`, {
            showId: selectedShow.id,
            showName: selectedShow.name,
            showDate: selectedShow.date,
            venueId: selectedShow.venue_id
          });
          
          // Step 6: Check or create setlist for the show
          console.log(`\n📍 STEP 6: Checking setlist for show: "${selectedShow.name}"`);
          
          const { data: existingSetlist, error: setlistError } = await supabase
            .from('setlists')
            .select('*')
            .eq('show_id', selectedShow.id)
            .maybeSingle();
          
          if (setlistError) {
            logError("Setlist Check", "Database", `Database error checking setlist: ${setlistError.message}`, setlistError);
            throw setlistError;
          }
          
          let setlistId = existingSetlist?.id;
          
          if (!existingSetlist) {
            // Create new setlist
            console.log(`Creating new setlist for show: ${selectedShow.name}`);
            
            const { data: newSetlist, error: createError } = await supabase
              .from('setlists')
              .insert({
                show_id: selectedShow.id
              })
              .select()
              .single();
            
            if (createError) {
              logError("Setlist Creation", "Database", `Database error creating setlist: ${createError.message}`, createError);
              throw createError;
            }
            
            setlistId = newSetlist.id;
            logSuccess("Setlist Creation", `Created new setlist for show: ${selectedShow.name}`, {
              setlistId: setlistId
            });
          } else {
            logSuccess("Setlist Check", `Found existing setlist for show: ${selectedShow.name}`, {
              setlistId: setlistId
            });
          }
          
          // Step 7: Check setlist songs
          console.log(`\n📍 STEP 7: Checking setlist songs`);
          
          // Using let instead of const to allow reassignment
          let { data: setlistSongs, error: songsError } = await supabase
            .from('setlist_songs')
            .select('*')
            .eq('setlist_id', setlistId);
          
          if (songsError) {
            logError("Setlist Songs", "Database", `Database error fetching setlist songs: ${songsError.message}`, songsError);
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
                logError("Add Setlist Song", "Database", `Error adding song "${track.name}" to setlist: ${addError.message}`, addError);
                throw addError;
              }
            }
            
            // Fetch the songs again
            const { data: updatedSongs, error: updatedError } = await supabase
              .from('setlist_songs')
              .select('*')
              .eq('setlist_id', setlistId);
            
            if (updatedError) {
              logError("Updated Setlist Songs", "Database", `Database error fetching updated setlist songs: ${updatedError.message}`, updatedError);
              throw updatedError;
            }
            
            logSuccess("Add Setlist Songs", `Added ${updatedSongs?.length || 0} songs to the setlist`, {
              songCount: updatedSongs?.length || 0,
              setlistId: setlistId
            });
            
            // Update our reference
            if (updatedSongs) {
              setlistSongs = updatedSongs;
            }
          } else {
            logSuccess("Setlist Songs", `Found ${setlistSongs.length} songs in the setlist`, {
              songCount: setlistSongs.length,
              setlistId: setlistId
            });
          }
          
          // Step 8: Simulate voting for a song
          console.log(`\n📍 STEP 8: Simulating vote for a song`);
          
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
              logError("Vote Check", "Database", `Database error checking existing vote: ${voteCheckError.message}`, voteCheckError);
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
                logError("Vote", "Database", `Database error voting for song: ${voteError.message}`, voteError);
                throw voteError;
              }
              
              // Increment the vote count
              const { error: incrementError } = await supabase.rpc(
                'increment_votes',
                { song_id: songToVoteFor.id }
              );
              
              if (incrementError) {
                logError("Vote Increment", "Database", `Database error incrementing vote count: ${incrementError.message}`, incrementError);
                throw incrementError;
              }
              
              logSuccess("Vote", `Successfully voted for song ID: ${songToVoteFor.id}`);
            } else {
              logSuccess("Vote Check", `Already voted for song ID: ${songToVoteFor.id}`);
            }
          } else {
            logError("Vote", "Client", "No songs available to vote for");
          }
          
          // Complete the test
          console.log(`\n✅ User journey test completed successfully!`);
        } catch (showsError) {
          console.error(`Error fetching shows:`, showsError);
          throw showsError;
        }
      } catch (artistDetailsError) {
        console.error(`Error fetching artist details:`, artistDetailsError);
        throw artistDetailsError;
      }
    } catch (searchError) {
      console.error(`Error searching for artist:`, searchError);
      throw searchError;
    }
    
    // Mark as completed
    results.completed = true;
  } catch (error) {
    console.error(`❌ Test failed:`, error);
    
    // If we didn't already log this error, log it now
    if (results.errors.length === 0) {
      logError("Unknown", "Client", `Unhandled error: ${(error as Error).message}`, error);
    }
    
    results.completed = false;
  } finally {
    // Finish the test
    results.endTime = new Date();
    const duration = results.endTime.getTime() - results.startTime.getTime();
    
    // Print summary
    console.log('\n---------------------------------------------');
    console.log(`🧪 User Journey Test Summary:`);
    console.log(`Start time: ${results.startTime.toLocaleString()}`);
    console.log(`End time: ${results.endTime.toLocaleString()}`);
    console.log(`Duration: ${(duration / 1000).toFixed(2)} seconds`);
    console.log(`Success steps: ${results.successes.length}`);
    console.log(`Error steps: ${results.errors.length}`);
    console.log(`Completed: ${results.completed ? 'Yes' : 'No'}`);
    
    if (results.errors.length > 0) {
      console.log('\n❌ Errors encountered:');
      results.errors.forEach((error, index) => {
        console.log(`  ${index + 1}. [${error.source}] at "${error.step}": ${error.message}`);
      });
    }
    
    return results;
  }
}
