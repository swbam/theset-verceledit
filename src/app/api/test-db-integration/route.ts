/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-ignore: Cannot find module 'next/server' type declarations
import { NextResponse } from 'next/server';
import { supabase } from '../../../lib/db'; // Direct Supabase client for verification
import { SyncManager } from '../../../lib/sync/manager'; // Import the SyncManager
import { EntityType } from '../../../lib/sync/types'; // Import EntityType

// Helper function for delaying execution
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Define an interface for the test result objects
interface TestResult {
  name: string;
  success: boolean;
  error?: string | null;
  details?: string | null;
}

/**
 * Test endpoint to verify the SyncManager integration is working properly.
 * It queues tasks via SyncManager and then verifies DB state.
 */
export async function GET(request: Request) {
  const tests: TestResult[] = []; // Explicitly type the array
  let allSuccess = true;
  const syncManager = new SyncManager(); // Instantiate SyncManager for this test run

  // Generate unique IDs for this test run
  const testRunId = new Date().getTime();
  const testArtistId = `test-artist-${testRunId}`;
  const testVenueId = `test-venue-${testRunId}`;
  const testShowId = `test-show-${testRunId}`;

  try {
    // --- Test 1: Supabase Connection ---
    try {
      const { error } = await supabase.from('artists').select('id').limit(1);
      tests.push({
        name: 'Supabase Connection',
        success: !error,
        error: error?.message,
        details: error ? null : 'Successfully connected to Supabase'
      });
      if (error) allSuccess = false;
    } catch (error) {
      tests.push({
        name: 'Supabase Connection',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        details: null
      });
      allSuccess = false;
      // Stop further tests if connection fails
      throw new Error("Supabase connection failed, cannot proceed with tests.");
    }

    // --- Test 2: Enqueue Tasks via SyncManager ---
    try {
      console.log(`[Test] Enqueuing tasks for run ID: ${testRunId}`);
      // Enqueue artist creation (using an ID format the sync service expects, e.g., Ticketmaster ID)
      // NOTE: The actual sync services might expect specific external IDs (Ticketmaster, Spotify, etc.)
      // For this test, we'll use our generated IDs, but the underlying sync services
      // might fail if they can't find these IDs in external APIs.
      // A more robust test might mock the API clients or use known valid external IDs.
      await syncManager.enqueueTask({
        type: 'artist',
        id: testArtistId, // Using generated ID - real sync might fail here
        priority: 'high',
        operation: 'create'
      });
      tests.push({ name: 'Enqueue Artist Task', success: true, details: `Task queued for artist ${testArtistId}` });

      await syncManager.enqueueTask({
        type: 'venue',
        id: testVenueId, // Using generated ID - real sync might fail here
        priority: 'high',
        operation: 'create'
      });
      tests.push({ name: 'Enqueue Venue Task', success: true, details: `Task queued for venue ${testVenueId}` });

      // We need artist/venue to exist before creating show that references them.
      // The queue processes async. We'll wait and verify artist/venue before queuing show.
      // Alternatively, the show sync logic should handle missing relations gracefully.
      // For simplicity here, we queue show immediately, assuming sync logic handles it.
      await syncManager.enqueueTask({
        type: 'show',
        id: testShowId, // Using generated ID - real sync might fail here
        priority: 'high',
        operation: 'create',
        // Payload might be needed if 'create' operation requires more context
        // payload: { artistId: testArtistId, venueId: testVenueId, date: new Date().toISOString(), name: 'Test Show' }
      });
      tests.push({ name: 'Enqueue Show Task', success: true, details: `Task queued for show ${testShowId}` });

    } catch (error) {
       const errorMsg = error instanceof Error ? error.message : 'Unknown error';
       tests.push({ name: 'Enqueue Tasks', success: false, error: `Failed to enqueue tasks: ${errorMsg}` });
       allSuccess = false;
       throw new Error(`Failed during task enqueueing: ${errorMsg}`);
    }

    // --- Test 3: Wait for Queue Processing ---
    const waitTimeMs = 5000; // Wait 5 seconds for async processing
    console.log(`[Test] Waiting ${waitTimeMs / 1000} seconds for queue processing...`);
    await delay(waitTimeMs);
    tests.push({ name: 'Wait for Queue', success: true, details: `Waited ${waitTimeMs / 1000}s` });
    console.log(`[Test] Checking database state...`);


    // --- Test 4: Verify Entities Created in DB ---
    try {
      // Verify Artist
      const { data: artistData, error: artistError } = await supabase
        .from('artists')
        .select('id, name')
        .eq('id', testArtistId) // Verify using the ID we tried to create
        .maybeSingle();
      tests.push({
        name: 'Verify Artist Creation',
        success: !!artistData && !artistError,
        error: artistError?.message || (!artistData ? 'Artist not found in DB' : null),
        details: artistData ? `Artist ${artistData.name} (ID: ${artistData.id}) found.` : null
      });
      if (!artistData || artistError) allSuccess = false;

      // Verify Venue
      const { data: venueData, error: venueError } = await supabase
        .from('venues')
        .select('id, name')
        .eq('id', testVenueId) // Verify using the ID we tried to create
        .maybeSingle();
      tests.push({
        name: 'Verify Venue Creation',
        success: !!venueData && !venueError,
        error: venueError?.message || (!venueData ? 'Venue not found in DB' : null),
        details: venueData ? `Venue ${venueData.name} (ID: ${venueData.id}) found.` : null
      });
      if (!venueData || venueError) allSuccess = false;

      // Verify Show
      const { data: showData, error: showError } = await supabase
        .from('shows')
        .select('id, name, artist_id, venue_id')
        .eq('id', testShowId) // Verify using the ID we tried to create
        .maybeSingle();
      tests.push({
        name: 'Verify Show Creation',
        success: !!showData && !showError,
        error: showError?.message || (!showData ? 'Show not found in DB' : null),
        details: showData ? `Show ${showData.name} (ID: ${showData.id}) found.` : null
        // Add checks for artist_id/venue_id if needed: && showData.artist_id === testArtistId
      });
      if (!showData || showError) allSuccess = false;

      // Optional: Verify Setlist Creation (if sync logic handles this)
      // This depends heavily on whether the 'create' show operation in SyncManager/ShowSyncService
      // automatically triggers setlist creation or relation expansion.
      // Add verification similar to the original test if applicable.

    } catch (error) {
       const errorMsg = error instanceof Error ? error.message : 'Unknown error';
       tests.push({ name: 'Verify DB State', success: false, error: `Error verifying DB state: ${errorMsg}` });
       allSuccess = false;
    }

    // --- Cleanup (Optional but Recommended) ---
    // Consider adding cleanup logic to delete the test entities after verification
    // Example:
    // await supabase.from('shows').delete().eq('id', testShowId);
    // await supabase.from('venues').delete().eq('id', testVenueId);
    // await supabase.from('artists').delete().eq('id', testArtistId);


    return NextResponse.json({
      success: allSuccess,
      message: allSuccess ? 'All SyncManager integration tests passed' : 'Some SyncManager tests failed',
      tests
    });

  } catch (error) {
    // Catch errors from connection failure or enqueueing failure
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[Test] Critical test failure: ${errorMsg}`);
    // Ensure tests array includes the failure reason if it happened before main try block finished
     if (!tests.some(t => !t.success)) {
        tests.push({ name: 'Test Setup Failure', success: false, error: errorMsg });
     }
    return NextResponse.json({
      success: false,
      message: `Test execution failed: ${errorMsg}`,
      error: errorMsg,
      tests // Include tests run so far
    }, { status: 500 });
  }
}
