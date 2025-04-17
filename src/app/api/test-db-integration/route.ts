import { supabase } from '@/lib/db';
import { EntityType } from '@/lib/sync-types';

/**
 * Test endpoint to verify the Edge Function sync integration is working properly.
 */
export async function POST(request: Request) {
  try {
    let allSuccess = true;
    const tests: Record<string, boolean> = {};

    // --- Test 1: Database Connection ---
    try {
      const { data, error } = await supabase
        .from('artists')
        .select('count(*)')
        .single();

      if (error) throw error;
      tests['database_connection'] = true;
    } catch (error) {
      console.error("Database connection test failed:", error);
      tests['database_connection'] = false;
      allSuccess = false;
    }

    // --- Test 2: Edge Function Invocations ---
    try {
      // Test artist sync
      const artistResult = await supabase.functions.invoke('sync-artist', {
        body: { 
          artistId: 'test-artist-id',
          payload: {
            id: 'test-artist-id',
            name: 'Test Artist'
          }
        }
      });

      tests['artist_sync'] = artistResult.data?.success || false;
      if (!artistResult.data?.success) {
        allSuccess = false;
      }

      // Test venue sync
      const venueResult = await supabase.functions.invoke('sync-venue', {
        body: { 
          venueId: 'test-venue-id',
          payload: {
            id: 'test-venue-id',
            name: 'Test Venue'
          }
        }
      });

      tests['venue_sync'] = venueResult.data?.success || false;
      if (!venueResult.data?.success) {
        allSuccess = false;
      }

      // Test show sync
      const showResult = await supabase.functions.invoke('sync-show', {
        body: { 
          showId: 'test-show-id',
          payload: {
            id: 'test-show-id',
            name: 'Test Show',
            artist_id: 'test-artist-id',
            venue_id: 'test-venue-id'
          }
        }
      });

      tests['show_sync'] = showResult.data?.success || false;
      if (!showResult.data?.success) {
        allSuccess = false;
      }

    } catch (error) {
      console.error("Edge Function tests failed:", error);
      tests['edge_functions'] = false;
      allSuccess = false;
    }

    // --- Test 3: Verify Data Relations ---
    try {
      const { data: show, error } = await supabase
        .from('shows')
        .select(`
          *,
          artist:artists(*),
          venue:venues(*)
        `)
        .eq('id', 'test-show-id')
        .single();

      if (error) throw error;

      tests['data_relations'] = !!(show?.artist && show?.venue);
      if (!show?.artist || !show?.venue) {
        allSuccess = false;
      }

    } catch (error) {
      console.error("Data relations test failed:", error);
      tests['data_relations'] = false;
      allSuccess = false;
    }

    return new Response(JSON.stringify({
      success: allSuccess,
      message: allSuccess ? 'All integration tests passed' : 'Some tests failed',
      tests
    }), {
      status: allSuccess ? 200 : 500,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error("Integration test error:", error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Integration test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
