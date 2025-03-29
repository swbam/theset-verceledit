/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-ignore: Cannot find module 'next/server' type declarations
import { NextResponse } from 'next/server';
import { supabase } from '../../../../lib/db';
import { syncTrendingShows } from '../../../../lib/api/shows';

/**
 * GET /api/shows/trending
 * Fetches trending shows from the database, with an option to sync with Ticketmaster
 */
export async function GET(request: Request) {
  try {
    // Parse query parameters
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '10', 10);
    const sync = url.searchParams.get('sync') === 'true';
    
    // If sync is requested, update trending shows in the background
    if (sync) {
      // Don't await this to avoid blocking the response
      syncTrendingShows().catch(err => {
        console.error('Background trending shows sync error:', err);
      });
    }
    
    // Fetch trending shows from the database
    const { data: shows, error } = await supabase
      .from('shows')
      .select(`
        id,
        name,
        date,
        image_url,
        ticket_url,
        popularity,
        artist_id,
        venue_id,
        updated_at,
        artist:artist_id (
          id,
          name,
          image_url,
          genres
        ),
        venue:venue_id (
          id,
          name,
          city,
          state,
          country
        )
      `)
      .order('popularity', { ascending: false })
      .limit(limit);
    
    console.log('[API /trending] Supabase query error:', error);
    console.log('[API /trending] Supabase query data:', shows);

    if (error) {
      console.error('Error fetching trending shows:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }
    
    // If no shows found, try to sync and fetch again
    if (!shows || shows.length === 0) {
      if (!sync) {
        // Try to sync and fetch again
        try {
          console.log('[API /trending] Attempting sync after empty DB result...');

          const syncedShows = await syncTrendingShows();
          
          if (syncedShows && syncedShows.length > 0) {
            console.log('[API /trending] Synced shows result:', syncedShows);

            return NextResponse.json(syncedShows.slice(0, limit));
          }
        } catch (syncError) {
          console.error('Error syncing trending shows:', syncError);
          console.error('[API /trending] Sync error after empty DB result:', syncError);

        }
      }
      
      return NextResponse.json([]);
      console.log('[API /trending] No shows found, returning empty array.');

    }
    
    return NextResponse.json(shows);
    console.log(`[API /trending] Returning ${shows?.length || 0} shows from DB.`);

  } catch (err: unknown) {
    let errorMessage = "Unknown error";
    if (err instanceof Error) {
      errorMessage = err.message;
    }
    console.error("Error in GET /api/shows/trending:", err);
    return NextResponse.json(
      { error: "Server error", details: errorMessage },
      { status: 500 }
    );
  }
}