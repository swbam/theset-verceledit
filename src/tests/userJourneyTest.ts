
import { toast } from "sonner";
import { TestResults } from './journey/types';
import { logError, logSuccess, DETAILED_LOGGING } from './journey/logger';
import { TEST_ARTIST_NAME } from './journey/config';
import { searchForArtist } from './journey/steps/artistSearch';
import { getArtistDetails } from './journey/steps/artistDetails';
import { getArtistShows } from './journey/steps/artistShows';
import { getArtistTracks } from './journey/steps/artistTracks';
import { 
  selectShow,
  getOrCreateSetlist, 
  manageSetlistSongs, 
  selectTrackFromDropdown,
  voteForSong 
} from './journey/steps/setlistOperations';

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

  try {
    console.log(`🧪 Starting User Journey Test: ${TEST_ARTIST_NAME}`);
    console.log('---------------------------------------------');

    // Step 1: Search for an artist (API + Database)
    const artists = await searchForArtist(results, TEST_ARTIST_NAME);
    
    // Step 2: Get artist details for the first result (Database + API fallback)
    const selectedArtist = artists[0];
    const artistDetails = await getArtistDetails(results, selectedArtist.id, selectedArtist.name);
    
    // Step 3: Get artist's upcoming shows (API → Database)
    const shows = await getArtistShows(results, artistDetails.id, artistDetails.name);
    
    // Step 4: Get artist's tracks (Database or API)
    const tracks = await getArtistTracks(results, artistDetails);
    
    // Step 5: Select a show (Client action)
    const selectedShow = await selectShow(results, shows[0]);
    
    // Step 6: Get/create setlist for the selected show (Database)
    const setlistId = await getOrCreateSetlist(results, selectedShow);
    
    // Step 7: Check setlist songs and add songs if needed (Database)
    const setlistSongs = await manageSetlistSongs(results, setlistId, tracks);
    
    // Step 8: Select a track from the dropdown (Client action)
    const selectedTrack = await selectTrackFromDropdown(results, tracks);
    
    // Step 9: Vote for a song (Client + Database)
    if (setlistSongs.length > 0) {
      await voteForSong(results, setlistSongs[0]);
    } else {
      logError(results, "Voting", "Client", "No songs available in setlist to vote for");
    }
    
    // Complete the test
    console.log(`\n✅ User journey test completed successfully!`);
    
    // Mark as completed
    results.completed = true;
  } catch (error) {
    console.error(`❌ Test failed:`, error);
    
    // If we didn't already log this error, log it now
    if (results.errors.length === 0) {
      logError(results, "Unknown", "Client", `Unhandled error: ${(error as Error).message}`, error);
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
