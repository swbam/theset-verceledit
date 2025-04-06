import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/integrations/supabase/server';
import { ArtistSyncService } from '@/lib/sync/artist-service';
import { VenueSyncService } from '@/lib/sync/venue-service';
import { ShowSyncService } from '@/lib/sync/show-service';
import { SongSyncService } from '@/lib/sync/song-service';

// Initialize services
const artistService = new ArtistSyncService();
const venueService = new VenueSyncService();
const showService = new ShowSyncService();
const songService = new SongSyncService();

/**
 * API route for searching external data sources
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const query = searchParams.get('query');
    const city = searchParams.get('city');
    const stateCode = searchParams.get('state');

    if (!type || !query) {
      return NextResponse.json(
        { error: 'Missing required parameters: type and query' },
        { 
          status: 400,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
          }
        }
      );
    }

    if (type !== 'venue') {
      return NextResponse.json(
        { error: `Unsupported search type: ${type}` },
        { 
          status: 400,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
          }
        }
      );
    }

    // Call the searchVenues method from the venue service
    const results = await venueService.searchVenues(
      query,
      city || undefined,
      stateCode || undefined
    );

    return NextResponse.json(
      { results },
      {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        }
      }
    );
  } catch (error) {
    console.error('Search API error:', error);
    
    return NextResponse.json(
      { error: 'Failed to perform search', details: error instanceof Error ? error.message : String(error) },
      { 
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        }
      }
    );
  }
}

// Add OPTIONS handler for CORS preflight requests
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

/**
 * API route for getting artist top songs
 */
export async function POST(request: NextRequest) {
  try {
    // Check if user is authenticated
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    // Parse request body
    const body = await request.json();
    
    if (!body.type || !body.id) {
      return NextResponse.json(
        { error: 'Missing required fields: type, id' },
        { status: 400 }
      );
    }
    
    let results: any[] = [];
    
    // Execute request based on type
    switch (body.type) {
      case 'artist_top_songs':
        results = await songService.getArtistTopSongs(body.id, body.limit || 10);
        break;
        
      case 'artist_upcoming_shows':
        results = await artistService.getArtistUpcomingShows(body.id);
        break;
        
      case 'venue_upcoming_shows':
        results = await venueService.getVenueUpcomingShows(body.id);
        break;
        
      case 'artist_setlists':
        const setlistService = new (await import('@/lib/sync/setlist-service')).SetlistSyncService();
        results = await setlistService.getArtistSetlists(body.id, body.limit || 10);
        break;
        
      default:
        return NextResponse.json(
          { error: 'Invalid request type' },
          { status: 400 }
        );
    }
    
    return NextResponse.json(
      { 
        success: true, 
        results,
        count: results.length
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in search API (POST):', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 