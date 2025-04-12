import { NextRequest, NextResponse } from 'next/server';
// Import the correct server-side client utility
import { createServerActionClient } from '@/integrations/supabase/utils'; 
import { ArtistSyncService } from '@/lib/sync/artist-service';
import { VenueSyncService } from '@/lib/sync/venue-service';
import { ShowSyncService } from '@/lib/sync/show-service';
import { SongSyncService } from '@/lib/sync/song-service';
import { SetlistSyncService } from '@/lib/sync/setlist-service'; // Import SetlistSyncService
// Import SyncManager to access services consistently
import { SyncManager } from '@/lib/sync/manager'; 

// Initialize SyncManager - this will instantiate all services internally
// Note: For serverless, consider singleton pattern if manager/queue state needs persistence beyond request lifecycle
const syncManager = new SyncManager();
// Access services via the manager instance if needed, or instantiate directly if manager is stateless for the request
const artistService = new ArtistSyncService(); // Keep direct instantiation if services are stateless
const venueService = new VenueSyncService();
const showService = new ShowSyncService();
const songService = new SongSyncService();
// SetlistSyncService needs the manager, get it from the instantiated manager
const setlistService = new SetlistSyncService(syncManager); 

// Define expected structure for Setlist.fm search response
interface SetlistFmSearchResult {
  setlist?: Array<{
    id: string;
    eventDate: string;
    venue?: { name?: string; city?: { name?: string } };
    // Add other fields if needed
  }>;
  // Add other top-level fields like 'total', 'page', 'itemsPerPage' if needed
}

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

    let results: any[] = [];

    if (type === 'venue') {
      // Call the searchVenues method from the venue service
      results = await venueService.searchVenues(
        query,
        city || undefined,
        stateCode || undefined
      );
    } else if (type === 'artist') {
       // Call the searchArtists method from the artist service
       results = await artistService.searchArtists(query);
    } else {
      // Handle unsupported search types
      return NextResponse.json(
        { error: `Unsupported search type: ${type}. Supported types: venue, artist` },
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

    // Return results for supported types
    return NextResponse.json(
      { results, count: results.length },
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
    // Check if user is authenticated using the correct server client
    const supabaseServerClient = createServerActionClient(); // Use the correct utility
    const { data: { user }, error: authError } = await supabaseServerClient.auth.getUser(); // Check for auth error too
    
    if (authError || !user) {
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
        // Use the refactored SetlistSyncService method
        // This method now returns basic info and queues the full sync task
        results = await setlistService.getArtistSetlists(body.id, body.limit || 10);
        // The sync task is now handled by the SyncQueue via the service method
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
