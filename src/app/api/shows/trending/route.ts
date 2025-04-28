/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-ignore: Cannot find module 'next/server' type declarations
import { NextResponse } from 'next/server';
import { supabase } from '../../../../lib/db';
// Removed non-existent import: import { syncTrendingShows } from '../../../../lib/api/shows';

/**
 * GET /api/shows/trending
 * Fetches trending shows from the database, ordered by popularity and vote count
 */
export async function GET(request: Request) {
  try {
    // Parse query parameters
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '10', 10);
    
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
        ticketmaster_id,
        artist:artists!shows_artist_id_fkey(
          id,
          name,
          image_url,
          ticketmaster_id
        ),
        venue:venues!shows_venue_id_fkey(
          id,
          name,
          city,
          state,
          ticketmaster_id
        ),
        votes(count)
      `)
      .gt('date', new Date().toISOString()) // Only future shows
      .order('popularity', { ascending: false })
      .limit(limit * 2); // Fetch extra to account for vote sorting
    
    if (error) {
      console.error('Error fetching trending shows:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }
    
    if (!shows || shows.length === 0) {
      return NextResponse.json([]);
    }

    // Calculate combined score based on votes and popularity
    const showsWithScores = shows.map(show => {
      const totalVotes = show.votes?.reduce((sum, vote) => sum + (vote.count || 0), 0) || 0;
      const popularity = show.popularity || 0;
      const score = (totalVotes * 2) + popularity;

      return {
        ...show,
        artist: Array.isArray(show.artist) ? show.artist[0] : show.artist,
        venue: Array.isArray(show.venue) ? show.venue[0] : show.venue,
        votes: undefined, // Remove raw votes data
        score
      };
    });

    // Sort by score and take top results
    const sortedShows = showsWithScores
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(({ score, ...show }) => show); // Remove score before returning

    return NextResponse.json(sortedShows);

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