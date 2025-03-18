import { NextRequest, NextResponse } from 'next/server';
import { populateTrendingShowsSetlists } from '@/lib/cron/trending-shows';

/**
 * Cron job handler to pre-populate setlists for trending/popular shows
 * This helps avoid the slow initialization when users first visit a show page
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
    // Run the trending shows setlist population job
    const result = await populateTrendingShowsSetlists();
    
    // Return the result
    return NextResponse.json(result);
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
