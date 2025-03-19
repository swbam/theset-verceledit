
import { TestStep, TestStepResult, TestContext } from '../types';
import { logInfo, logSuccess, logWarning, logError } from '../logger';

export const testArtistHasTracks: TestStep = async (context: TestContext): Promise<TestStepResult> => {
  const { artistId, spotifyArtistId } = context;
  
  if (!artistId || !spotifyArtistId) {
    logError(
      context as { errors: any[] }, 
      'Artist Tracks', 
      'Client', 
      'Artist ID or Spotify Artist ID is missing'
    );
    return {
      success: false,
      message: 'Test prerequisites missing: Need both artistId and spotifyArtistId'
    };
  }
  
  logInfo(`Testing tracks for artist ID ${artistId} (Spotify ID: ${spotifyArtistId})`);
  
  try {
    // Attempt to fetch tracks from our database first
    const { data: artistData } = await context.supabase
      .from('artists')
      .select('stored_tracks')
      .eq('id', artistId)
      .single();
    
    if (artistData?.stored_tracks && artistData.stored_tracks.length > 0) {
      logSuccess(
        context as { successes: any[] }, 
        'Artist Tracks', 
        `Found ${artistData.stored_tracks.length} tracks in database for artist ${artistId}`
      );
      context.artistTracks = artistData.stored_tracks;
      return {
        success: true,
        message: `Artist has ${artistData.stored_tracks.length} tracks stored in database`
      };
    }
    
    // If no tracks in DB, fetch from Spotify API
    logInfo('No tracks in database, fetching from Spotify API');
    
    // Fetch tracks from Spotify API
    try {
      const response = await fetch(`/api/artist/${spotifyArtistId}/tracks`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch tracks: ${response.statusText}`);
      }
      
      const tracksData = await response.json();
      
      if (!tracksData.tracks || tracksData.tracks.length === 0) {
        logWarning(`No tracks found for artist ${artistId} via API`);
        return {
          success: false,
          message: 'No tracks found via Spotify API'
        };
      }
      
      logSuccess(
        context as { successes: any[] }, 
        'Artist Tracks', 
        `Found ${tracksData.tracks.length} tracks via Spotify API`
      );
      context.artistTracks = tracksData.tracks;
      
      // Save tracks to database in background
      try {
        const { error } = await context.supabase
          .from('artists')
          .update({
            stored_tracks: tracksData.tracks,
            tracks_last_updated: new Date().toISOString()
          })
          .eq('id', artistId);
        
        if (error) {
          logError(
            context as { errors: any[] }, 
            'Artist Tracks', 
            'Database', 
            `Error saving tracks to database: ${error.message}`
          );
        } else {
          logSuccess(
            context as { successes: any[] }, 
            'Artist Tracks', 
            'Saved tracks to database for future use'
          );
        }
      } catch (dbError) {
        logError(
          context as { errors: any[] }, 
          'Artist Tracks', 
          'Database', 
          'Database error when saving tracks',
          dbError
        );
      }
      
      return {
        success: true,
        message: `Artist has ${tracksData.tracks.length} tracks from Spotify API`
      };
    } catch (apiError) {
      logError(
        context as { errors: any[] }, 
        'Artist Tracks', 
        'API', 
        `API Error fetching tracks: ${apiError instanceof Error ? apiError.message : String(apiError)}`
      );
      return {
        success: false,
        message: 'Error fetching tracks from Spotify API'
      };
    }
  } catch (error) {
    logError(
      context as { errors: any[] }, 
      'Artist Tracks', 
      'Client', 
      `General error testing artist tracks: ${error instanceof Error ? error.message : String(error)}`
    );
    return {
      success: false,
      message: 'Error testing artist tracks'
    };
  }
};

// Export the same function as getArtistTracks for backwards compatibility
export const getArtistTracks = testArtistHasTracks;
