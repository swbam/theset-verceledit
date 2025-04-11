/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-ignore: Cannot find module 'next/server' type declarations
import { NextResponse } from 'next/server';
import { syncTrendingShows } from '../../../../lib/api/shows';

/**
 * GET /api/cron/sync-trending
 * Endpoint for scheduled syncing of trending shows
 * This can be called by a cron job every 12 hours
 */
export async function GET(request: Request) {
  try {
    // Check for secret to prevent unauthorized access
    const url = new URL(request.url);
    const secret = url.searchParams.get('secret');
    const expectedSecret = process.env.VITE_REVALIDATE_SECRET || import.meta.env.VITE_REVALIDATE_SECRET;
    
    if (!secret || secret !== expectedSecret) {
      return NextResponse.json(
        { error: 'Invalid secret' },
        { status: 401 }
      );
    }
    
    // Sync trending shows
    console.log('Starting scheduled sync of trending shows...');
    const syncedShows = await syncTrendingShows();
    
    return NextResponse.json({
      success: true,
      message: `Successfully synced ${syncedShows.processed || 0} trending shows`,
      timestamp: new Date().toISOString()
    });
  } catch (err: unknown) {
    let errorMessage = "Unknown error";
    if (err instanceof Error) {
      errorMessage = err.message;
    }
    console.error("Error in scheduled trending shows sync:", err);
    return NextResponse.json(
      { error: "Server error", details: errorMessage },
      { status: 500 }
    );
  }
}