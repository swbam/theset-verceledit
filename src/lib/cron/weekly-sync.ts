import { queueArtistsForStatsSync } from '../api/db/artist-utils';

/**
 * Handles weekly sync of artist stats from Spotify to the database
 * This function should be called by a scheduled job (e.g., Vercel Cron, AWS Lambda)
 */
export async function weeklyArtistStatsSync() {
  console.log("Starting weekly artist stats sync...");
  
  try {
    // Queue and process all artists that need syncing
    const syncedCount = await queueArtistsForStatsSync();
    
    console.log(`Weekly sync completed: updated ${syncedCount} artists`);
    return { success: true, syncedCount };
  } catch (error) {
    console.error("Error during weekly artist stats sync:", error);
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

// For local testing
if (process.env.NODE_ENV === 'development' && process.env.MANUAL_SYNC === 'true') {
  weeklyArtistStatsSync()
    .then(result => console.log("Manual sync result:", result))
    .catch(error => console.error("Manual sync error:", error));
} 