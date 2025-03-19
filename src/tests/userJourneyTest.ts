
import { toast } from "sonner";
import { TestResults } from './journey/types';
import { logError, logSuccess, DETAILED_LOGGING } from './journey/logger';
import { TEST_ARTIST_NAME, TEST_ARTIST_ID } from './journey/config';
import { getArtistDetails } from './journey/steps/artistDetails';
import { getArtistShows } from './journey/steps/artistShows';
import { getArtistTracks } from './journey/steps/artistTracks';
import { 
  selectShow,
  getOrCreateSetlist, 
  manageSetlistSongs, 
  selectTrackFromDropdown,
  addSongToSetlist,
  voteForSong,
  verifySetlistOrder
} from './journey/steps/setlistOperations';

/**
 * Comprehensive test to simulate the complete user journey
 */
export async function runUserJourneyTest(
  artistId: string = TEST_ARTIST_ID, 
  artistName: string = TEST_ARTIST_NAME
): Promise<TestResults> {
  const results: TestResults = {
    startTime: new Date(),
    endTime: null,
    errors: [],
    successes: [],
    completed: false
  };

  try {
    console.log(`🧪 Starting User Journey Test with artist ID: ${artistId} (${artistName})`);
    console.log('---------------------------------------------');
    
    // Step 1: Get artist details directly using ID (Database + API fallback)
    const artistDetails = await getArtistDetails(results, artistId, artistName);
    
    // Step 2: Get artist's upcoming shows (API → Database)
    const shows = await getArtistShows(results, artistDetails.id, artistDetails.name);
    
    // Step 3: Get artist's tracks (Database or API)
    const tracks = await getArtistTracks(results, artistDetails);
    
    // Step 4: Select a show (Client action)
    const selectedShow = await selectShow(results, shows[0]);
    
    // Step 5: Get/create setlist for the selected show (Database)
    const setlistId = await getOrCreateSetlist(results, selectedShow);
    
    // Step 6: Check setlist songs and add songs if needed (Database)
    const setlistSongs = await manageSetlistSongs(results, setlistId, tracks);
    
    // Step 7: Select a track from the dropdown (Client action)
    const selectedTrack = await selectTrackFromDropdown(results, tracks);
    
    // Step 8: Add selected song to setlist (Database)
    const addedSong = await addSongToSetlist(results, setlistId, selectedTrack);
    
    // Step 9: Vote for a song (Client + Database)
    if (setlistSongs.length > 0) {
      await voteForSong(results, setlistSongs[0]);
    } else if (addedSong) {
      await voteForSong(results, addedSong);
    } else {
      logError(results, "Voting", "Client", "No songs available in setlist to vote for");
    }
    
    // Step 10: Verify setlist reordering by votes (Database)
    await verifySetlistOrder(results, setlistId);
    
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
    console.log(`Artist: ${artistName} (ID: ${artistId})`);
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
