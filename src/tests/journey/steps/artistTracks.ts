
import { TestContext, TestResult } from '../types';
import { supabase } from '@/integrations/supabase/client';
import { fetchArtistById } from '@/lib/api/artist/fetch';
import { logError, logSuccess } from '../logger';

/**
 * Test if an artist has tracks stored
 */
export async function testArtistHasTracks(context: TestContext): Promise<TestResult> {
  console.log(`ℹ️ INFO: Starting artist tracks test for artist ID: ${context.artistId} `);
  
  try {
    // First try to get artist from database
    let artist;
    
    try {
      const { data, error } = await supabase
        .from('artists')
        .select('*')
        .eq('id', context.artistId)
        .maybeSingle();
      
      if (error) {
        logError(context, "Get Artist", "Database", `Failed to fetch artist from database: ${error.message}`, error);
        console.log("Will try API fetch instead since database fetch failed");
      } else if (data) {
        artist = data;
        logSuccess(context, "Get Artist", `Successfully fetched artist from database: ${artist.name}`);
      }
    } catch (dbError) {
      logError(context, "Get Artist", "Database", `Error querying database: ${(dbError as Error).message}`, dbError);
      console.log("Will try API fetch instead due to database error");
    }
    
    // If not found in database or error occurred, try fetching from API
    if (!artist) {
      try {
        artist = await fetchArtistById(context.artistId);
        
        if (!artist) {
          logError(context, "Get Artist", "API", `Artist not found with ID: ${context.artistId}`);
          return { 
            success: false, 
            message: `Artist not found with ID: ${context.artistId}` 
          };
        }
        
        logSuccess(context, "Get Artist", `Successfully fetched artist from API: ${artist.name}`);
        
        // Try to save to database but don't fail the test if this fails
        try {
          const { error: insertError } = await supabase
            .from('artists')
            .upsert({
              id: artist.id,
              name: artist.name,
              image_url: artist.image_url || artist.image,
              spotify_id: artist.spotify_id,
              updated_at: new Date().toISOString()
            });
            
          if (insertError) {
            console.log(`Note: Could not save artist to database: ${insertError.message}`);
          } else {
            logSuccess(context, "Save Artist", `Successfully saved artist to database: ${artist.name}`);
          }
        } catch (saveError) {
          console.log(`Note: Error saving artist to database: ${(saveError as Error).message}`);
        }
      } catch (apiError) {
        logError(context, "Get Artist", "API", `Failed to fetch artist from API: ${(apiError as Error).message}`, apiError);
        return { 
          success: false, 
          message: `Failed to fetch artist: ${(apiError as Error).message}` 
        };
      }
    }
    
    // Check if artist has stored tracks
    if (artist.stored_tracks && Array.isArray(artist.stored_tracks) && artist.stored_tracks.length > 0) {
      logSuccess(context, "Check Tracks", `Artist has ${artist.stored_tracks.length} tracks stored`);
      return { 
        success: true, 
        message: `Artist ${artist.name} has ${artist.stored_tracks.length} tracks stored` 
      };
    } else if (artist.spotify_id) {
      // If artist has Spotify ID but no tracks, log this as a warning
      logError(context, "Check Tracks", "Data", `Artist has Spotify ID but no stored tracks. Should trigger track fetch.`);
      return { 
        success: false, 
        message: `Artist has Spotify ID (${artist.spotify_id}) but no stored tracks` 
      };
    } else {
      // If artist has no Spotify ID and no tracks, this is expected in some cases
      logError(context, "Check Tracks", "Data", `Artist has no Spotify ID and no stored tracks.`);
      return { 
        success: false, 
        message: `Artist has no Spotify ID or stored tracks` 
      };
    }
  } catch (error) {
    logError(context, "Artist Tracks Test", "Client", `Error running artist tracks test: ${(error as Error).message}`, error);
    return { 
      success: false, 
      message: `Error running artist tracks test: ${(error as Error).message}` 
    };
  }
}
