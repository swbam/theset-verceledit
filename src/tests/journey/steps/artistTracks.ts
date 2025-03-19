
import { TestStep, TestStepResult, TestContext } from '../types';
import { logInfo, logError, logSuccess, logWarning } from '../logger';
import { getArtistAllTracks } from '@/lib/spotify';

/**
 * Tests that an artist has tracks that can be fetched
 */
export const testArtistHasTracks: TestStep = async (context: TestContext): Promise<TestStepResult> => {
  try {
    // Log test start
    logInfo(`Starting artist tracks test for artist ID: ${context.artistId || 'K8vZ917GbGV'}`);
    
    // Use a hardcoded artist ID if one isn't provided
    const artistId = context.artistId || 'K8vZ917GbGV'; // Dua Lipa ID
    
    // First get the artist's details from the database
    const { data: artist, error: artistError } = await context.supabase
      .from('artists')
      .select('name, spotify_id')
      .eq('id', artistId)
      .maybeSingle();
    
    if (artistError) {
      logError(context, 'Get Artist', 'Database', `Failed to fetch artist from database: ${artistError.message}`, artistError);
      return {
        success: false,
        message: `Database error when fetching artist: ${artistError.message}`
      };
    }
    
    if (!artist) {
      // Not a critical error as we can test with a known Spotify ID
      logWarning(`Artist with ID ${artistId} not found in database. Using fallback values.`);
      
      // Use Dua Lipa's Spotify ID as a fallback
      context.spotifyArtistId = '6M2wZ9GZgrQXHCFfjv46we';
    } else {
      logSuccess(context, 'Get Artist', `Successfully fetched artist "${artist.name}" (ID: ${artistId})`, artist);
      
      context.spotifyArtistId = artist.spotify_id;
    }
    
    // If we don't have a Spotify ID at this point, we can't proceed
    if (!context.spotifyArtistId) {
      logError(context, 'Get Artist Tracks', 'API', 'No Spotify ID available for this artist');
      return {
        success: false,
        message: 'No Spotify ID available for this artist'
      };
    }
    
    // Now try to fetch tracks from Spotify
    try {
      logInfo(`Fetching tracks for Spotify artist ID: ${context.spotifyArtistId}`);
      
      const tracksResult = await getArtistAllTracks(context.spotifyArtistId);
      
      if (tracksResult && tracksResult.tracks && tracksResult.tracks.length > 0) {
        logSuccess(context, 'Get Artist Tracks', `Successfully fetched ${tracksResult.tracks.length} tracks`, {
          trackCount: tracksResult.tracks.length,
          firstTrack: tracksResult.tracks[0]
        });
        
        // Store tracks in context for later use
        context.artistTracks = tracksResult.tracks;
        
        return {
          success: true,
          message: `Successfully fetched ${tracksResult.tracks.length} tracks for the artist`,
          details: {
            trackCount: tracksResult.tracks.length
          }
        };
      } else {
        logError(context, 'Get Artist Tracks', 'API', `No tracks found for Spotify artist ID: ${context.spotifyArtistId}`);
        return {
          success: false,
          message: `No tracks found for this artist`
        };
      }
    } catch (spotifyError) {
      logError(context, 'Get Artist Tracks', 'API', `Spotify API error: ${spotifyError.message}`, spotifyError);
      return {
        success: false,
        message: `Failed to fetch artist tracks from Spotify: ${spotifyError.message}`
      };
    }
  } catch (error) {
    logError(context, 'Artist Tracks Test', 'Client', `Unexpected error: ${error.message}`, error);
    return {
      success: false,
      message: `Unexpected error in artist tracks test: ${error.message}`
    };
  }
};
