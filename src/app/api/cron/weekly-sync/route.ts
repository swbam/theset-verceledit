import { NextRequest, NextResponse } from 'next/server';
import { weeklyArtistStatsSync } from '@/lib/cron/weekly-sync';

// Vercel Cron job handler for weekly artist stats sync
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
    // Run the weekly sync job
    const result = await weeklyArtistStatsSync();
    
    // Return the result
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error in weekly sync cron job:', error);
    
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