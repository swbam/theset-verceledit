
import { getArtistAllTracks } from "@/lib/spotify";
import { TestResults } from '../types';
import { logError, logSuccess } from '../logger';

/**
 * Step 4: Get artist's tracks
 */
export async function getArtistTracks(
  results: TestResults, 
  artistDetails: any
): Promise<any[]> {
  console.log(`\n📍 STEP 4: Fetching tracks for artist: "${artistDetails.name}" (Background process when viewing artist)`);
  
  try {
    let tracks = [];
    // First check if there are stored tracks in the database
    if (artistDetails.stored_tracks && Array.isArray(artistDetails.stored_tracks)) {
      tracks = artistDetails.stored_tracks;
      logSuccess(results, "Artist Tracks", `Using ${tracks.length} stored tracks for artist: ${artistDetails.name} (Database)`, {
        trackCount: tracks.length,
        firstTrack: tracks[0]?.name || "N/A"
      });
    } else if (artistDetails.spotify_id) {
      // If no stored tracks but we have Spotify ID, fetch from Spotify API
      try {
        const tracksData = await getArtistAllTracks(artistDetails.spotify_id);
        
        if (!tracksData || !tracksData.tracks || tracksData.tracks.length === 0) {
          logError(results, "Artist Tracks", "API", `No tracks found on Spotify for artist: ${artistDetails.name}`);
          throw new Error(`No tracks found on Spotify for artist: ${artistDetails.name}`);
        }
        
        tracks = tracksData.tracks;
        logSuccess(results, "Artist Tracks", `Fetched ${tracks.length} tracks from Spotify for artist: ${artistDetails.name} (Spotify API)`, {
          trackCount: tracks.length,
          firstTrack: tracks[0]?.name || "N/A"
        });
      } catch (spotifyError) {
        logError(results, "Artist Tracks", "API", `Error fetching tracks from Spotify: ${(spotifyError as Error).message}`, spotifyError);
        throw spotifyError;
      }
    } else {
      logError(results, "Artist Tracks", "Client", `No stored tracks and no Spotify ID available for artist: ${artistDetails.name}`);
      throw new Error(`No stored tracks and no Spotify ID available for artist: ${artistDetails.name}`);
    }
    
    return tracks;
  } catch (error) {
    logError(results, "Artist Tracks", "API", `Error fetching artist tracks: ${(error as Error).message}`, error);
    throw error;
  }
}
