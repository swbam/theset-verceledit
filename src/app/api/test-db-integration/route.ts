/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-ignore: Cannot find module 'next/server' type declarations
import { NextResponse } from 'next/server';
import { supabase } from '../../../lib/db';
import { saveArtistToDatabase, saveVenueToDatabase, saveShowToDatabase } from '../../../lib/api/database-utils';
import { fetchAndStoreArtistTracks } from '../../../lib/api/database';

/**
 * Test endpoint to verify our database integration is working properly
 */
export async function GET(request: Request) {
  try {
    const tests = [];
    let allSuccess = true;

    // Test 1: Verify we can connect to Supabase
    try {
      const { data, error } = await supabase.from('artists').select('count').limit(1);
      
      tests.push({
        name: 'Supabase Connection',
        success: !error,
        error: error?.message,
        details: error ? null : 'Successfully connected to Supabase'
      });
      
      if (error) allSuccess = false;
    } catch (error) {
      tests.push({
        name: 'Supabase Connection',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        details: null
      });
      allSuccess = false;
    }

    // Test 2: Save an artist
    try {
      const testArtist = {
        id: 'test-artist-' + new Date().getTime(),
        name: 'Test Artist',
        image: 'https://example.com/test.jpg',
        spotify_id: 'spotify:test:' + new Date().getTime()
      };
      
      const savedArtist = await saveArtistToDatabase(testArtist);
      
      tests.push({
        name: 'Save Artist',
        success: !!savedArtist,
        error: !savedArtist ? 'Failed to save artist' : null,
        details: savedArtist ? `Saved artist ${savedArtist.name}` : null
      });
      
      if (!savedArtist) allSuccess = false;
      
      // Test 3: Save a venue
      if (savedArtist) {
        const testVenue = {
          id: 'test-venue-' + new Date().getTime(),
          name: 'Test Venue',
          city: 'Test City',
          state: 'TS',
          country: 'Test Country'
        };
        
        const savedVenue = await saveVenueToDatabase(testVenue);
        
        tests.push({
          name: 'Save Venue',
          success: !!savedVenue,
          error: !savedVenue ? 'Failed to save venue' : null,
          details: savedVenue ? `Saved venue ${savedVenue.name}` : null
        });
        
        if (!savedVenue) allSuccess = false;
        
        // Test 4: Save a show
        if (savedVenue) {
          const testShow = {
            id: 'test-show-' + new Date().getTime(),
            name: 'Test Show',
            date: new Date().toISOString(),
            artist_id: savedArtist.id,
            venue_id: savedVenue.id,
            artist: savedArtist,
            venue: savedVenue
          };
          
          const savedShow = await saveShowToDatabase(testShow);
          
          tests.push({
            name: 'Save Show',
            success: !!savedShow,
            error: !savedShow ? 'Failed to save show' : null,
            details: savedShow ? `Saved show ${savedShow.name}` : null
          });
          
          if (!savedShow) allSuccess = false;
          
          // Test 5: Check that a setlist was created
          if (savedShow) {
            const { data: setlist, error: setlistError } = await supabase
              .from('setlists')
              .select('id, setlist_songs(id)')
              .eq('show_id', savedShow.id)
              .maybeSingle();
              
            const hasSetlist = !!setlist;
            const hasSongs = hasSetlist && Array.isArray(setlist.setlist_songs) && setlist.setlist_songs.length > 0;
            
            tests.push({
              name: 'Setlist Creation',
              success: hasSetlist && hasSongs,
              error: setlistError?.message || (!hasSetlist ? 'No setlist created' : (!hasSongs ? 'Setlist has no songs' : null)),
              details: (hasSetlist && hasSongs) ? `Setlist created with ${setlist.setlist_songs.length} songs` : null
            });
            
            if (!hasSetlist || !hasSongs) allSuccess = false;
          }
        }
      }
    } catch (error) {
      tests.push({
        name: 'Database Integration',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        details: null
      });
      allSuccess = false;
    }

    return NextResponse.json({
      success: allSuccess,
      message: allSuccess ? 'All database integration tests passed' : 'Some tests failed',
      tests
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      message: 'Test execution failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
