/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-ignore: Cannot find module 'next/server' type declarations
import { NextResponse } from 'next/server';
import { supabase } from '../../../../lib/db';
// Removed non-existent import: import { syncTrendingShows } from '../../../../lib/api/shows';

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
    // Removed call to non-existent syncTrendingShows
    // if (sync) {
    //   syncTrendingShows().catch(err => {
    //     console.error('Background trending shows sync error:', err);
    //   });
    // }
    
    // Fetch trending shows from the database
    const { data: shows, error } = await supabase
      .from('shows')
      .select(`
        id,
        date,
        venue,
        artists!shows_artists( name, spotify_id )
      `)
      .order('votes_count', { ascending: false }) // Was filtering by artist_id
      .limit(50);
    
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
    // Removed logic attempting to sync after empty result
    if (!shows || shows.length === 0) {
      console.log('[API /trending] No shows found, returning empty array.');
      return NextResponse.json([]);
    }

    // Rename related data for clarity before returning
    // Moved this block after the check for empty shows
    const formattedShows = shows.map(show => ({
      ...show,
      artist: show.artists, // Rename 'artists' to 'artist'
      venue: show.venues,   // Rename 'venues' to 'venue'
      artists: undefined, // Remove original 'artists'
      venues: undefined   // Remove original 'venues'
    }));
    console.log(`[API /trending] Returning ${formattedShows.length} shows from DB.`);
    
    return NextResponse.json(formattedShows);
    // Removed duplicate formattedShows block

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