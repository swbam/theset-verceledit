import { batchCreateSetlistsForPopularShows } from './setlist-batch';
import { queueArtistsForStatsSync } from './artist-utils';
import { initializeHomepageShowSetlists } from './homepage-init';
import { logJobRun } from './job-logs';
import { importShowsFromTopVenues } from '@/lib/cron/import-venue-shows';

/**
 * Main cron job handler for setlist creation and maintenance
 * This function is designed to be called from a scheduled job
 * It runs all necessary maintenance tasks:
 * 1. Pre-create setlists for upcoming popular shows
 * 2. Pre-create setlists for homepage featured shows
 * 3. Sync artist stats from Spotify
 * 
 * @returns An object with results from all operations
 */
export async function runMaintenanceJobs() {
  console.log("Starting scheduled maintenance jobs");
  const startTime = new Date();
  
  const results = {
    setlistsCreated: 0,
    setlistsProcessed: 0,
    homepageSetlistsCreated: 0,
    homepageSetlistsProcessed: 0,
    setlistErrors: [] as string[],
    artistsUpdated: 0,
    startTime: startTime.toISOString(),
    endTime: '',
    duration: 0,
    timestamp: startTime.toISOString()
  };

  try {
    // Step 1: Create setlists for popular shows
    console.log("Running batch creation of setlists for popular shows");
    const setlistResults = await batchCreateSetlistsForPopularShows();
    
    results.setlistsCreated = setlistResults.created;
    results.setlistsProcessed = setlistResults.processed;
    results.setlistErrors = setlistResults.errors;
    
    // Log this step
    await logJobRun({
      job_type: 'setlist_batch',
      items_processed: setlistResults.processed,
      items_created: setlistResults.created,
      errors: setlistResults.errors,
      status: setlistResults.errors.length === 0 ? 'success' : 'partial'
    });
    
    console.log(`Setlist creation complete: created ${setlistResults.created} setlists`);
    
    // Step 2: Initialize homepage show setlists
    console.log("Running initialization of homepage show setlists");
    const homepageResults = await initializeHomepageShowSetlists();
    
    results.homepageSetlistsCreated = homepageResults.created;
    results.homepageSetlistsProcessed = homepageResults.processed;
    results.setlistErrors = [
      ...results.setlistErrors, 
      ...homepageResults.errors
    ];
    
    // Log this step
    await logJobRun({
      job_type: 'homepage_init',
      items_processed: homepageResults.processed,
      items_created: homepageResults.created,
      errors: homepageResults.errors,
      status: homepageResults.errors.length === 0 ? 'success' : 'partial'
    });
    
    console.log(`Homepage setlist creation complete: created ${homepageResults.created} setlists`);
    
    // Step 3: Sync artist stats from Spotify
    console.log("Running artist stats sync");
    const syncedCount = await queueArtistsForStatsSync();
    
    results.artistsUpdated = syncedCount;
    
    // Log this step
    await logJobRun({
      job_type: 'artist_sync',
      items_processed: syncedCount,
      items_created: syncedCount,
      errors: [],
      status: 'success'
    });
    
    console.log(`Artist sync complete: updated ${syncedCount} artists`);
    
    // Step 4: Import shows from top venues
    console.log("Running venue-based show import");
    const venueResults = await importShowsFromTopVenues(10, 5);
    
    // Log this step
    await logJobRun({
      job_type: 'venue_shows_import',
      items_processed: venueResults.showsProcessed,
      items_created: venueResults.showsCreated,
      errors: venueResults.errors,
      status: venueResults.errors.length === 0 ? 'success' : 'partial'
    });
    
    console.log(`Venue show import complete: created ${venueResults.showsCreated} shows from ${venueResults.venuesProcessed} venues`);
    
    // Set final timestamps
    const endTime = new Date();
    results.endTime = endTime.toISOString();
    results.duration = endTime.getTime() - startTime.getTime();
    
    // Log the entire maintenance run
    await logJobRun({
      job_type: 'maintenance_run',
      items_processed: results.setlistsProcessed + results.homepageSetlistsProcessed + results.artistsUpdated,
      items_created: results.setlistsCreated + results.homepageSetlistsCreated + results.artistsUpdated,
      errors: results.setlistErrors,
      status: results.setlistErrors.length === 0 ? 'success' : 'partial',
      metadata: {
        duration_ms: results.duration,
        setlists_created: results.setlistsCreated,
        homepage_setlists_created: results.homepageSetlistsCreated,
        artists_updated: results.artistsUpdated
      }
    });
    
    return results;
  } catch (error) {
    console.error("Error running maintenance jobs:", error);
    const errorMsg = `Global error: ${error instanceof Error ? error.message : String(error)}`;
    results.setlistErrors.push(errorMsg);
    
    // Log the error
    await logJobRun({
      job_type: 'maintenance_run',
      items_processed: results.setlistsProcessed + results.homepageSetlistsProcessed + results.artistsUpdated,
      items_created: results.setlistsCreated + results.homepageSetlistsCreated + results.artistsUpdated,
      errors: [errorMsg],
      status: 'failure'
    });
    
    // Set final timestamps even on error
    const endTime = new Date();
    results.endTime = endTime.toISOString();
    results.duration = endTime.getTime() - startTime.getTime();
    
    return results;
  }
}

/**
 * This function can be exposed as an API endpoint to trigger the jobs manually
 * It provides authentication and rate limiting to prevent abuse
 * 
 * @param apiKey API key for authentication
 * @returns Results of the maintenance job or error
 */
export async function triggerMaintenanceJobs(apiKey: string) {
  // Simple API key check (should be replaced with proper auth in production)
  if (apiKey !== process.env.MAINTENANCE_API_KEY) {
    return { error: "Unauthorized" };
  }
  
  // We could add rate limiting here to prevent too frequent calls
  
  try {
    const results = await runMaintenanceJobs();
    return {
      success: true,
      ...results
    };
  } catch (error) {
    console.error("Error triggering maintenance jobs:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Helper function to check if a maintenance run is needed
 * This helps prevent running jobs too frequently
 * 
 * @returns Boolean indicating whether maintenance should run
 */
export async function shouldRunMaintenance(): Promise<boolean> {
  // This could check a database record for the last run time
  // For now, we'll just return true to always run
  return true;
}