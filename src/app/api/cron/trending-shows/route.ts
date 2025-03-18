import { NextRequest, NextResponse } from 'next/server';
import { populateTrendingShowsSetlists } from '@/lib/cron/trending-shows';
import { importTrendingShows } from '@/lib/cron/import-trending-shows';

/**
 * Cron job handler to import trending shows from Ticketmaster and pre-populate setlists
 * This helps avoid unnecessary API calls and slow initialization when users visit the site
 */
export async function GET(request: NextRequest) {
  // Verify authorization token for security
  const authHeader = request.headers.get('authorization');
  
  if (!authHeader || authHeader !== `Bearer ${process.env.CRON_SECRET_TOKEN}`) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }
  
  try {
    // First import trending shows from Ticketmaster to our database
    console.log('Starting trending shows import and population...');
    const importResult = await importTrendingShows();
    
    // Then run the trending shows setlist population job
    // This will use the newly imported shows
    const populateResult = await populateTrendingShowsSetlists();
    
    // Return the combined results
    return NextResponse.json({
      success: true,
      import: importResult,
      populate: populateResult
    });
  } catch (error) {
    console.error('Error in trending shows cron job:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : String(error) 
      },
      { status: 500 }
    );
  }
}

// Explicitly set dynamic flag for Vercel Edge Functions
export const dynamic = 'force-dynamic';
