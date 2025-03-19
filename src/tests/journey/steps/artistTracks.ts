
import { supabase } from "@/integrations/supabase/client";
import { TestResults } from '../types';
import { logError, logSuccess, DETAILED_LOGGING } from '../logger';

/**
 * Step 3: Get artist's tracks
 */
export async function getArtistTracks(
  results: TestResults, 
  artistDetails: any
): Promise<any[]> {
  console.log(`\n📍 STEP 3: Fetching tracks for artist: "${artistDetails.name}" (Simulating loading artist's songs)`);
  
  try {
    // Check for stored tracks in the artist record first
    if (artistDetails.stored_tracks && Array.isArray(artistDetails.stored_tracks) && artistDetails.stored_tracks.length > 0) {
      logSuccess(results, "Artist Tracks", `Using ${artistDetails.stored_tracks.length} stored tracks from artist record (Database)`, {
        trackCount: artistDetails.stored_tracks.length,
        sampleTrack: artistDetails.stored_tracks[0]?.name || 'N/A'
      });
      
      return artistDetails.stored_tracks;
    }
    
    // Otherwise, try to get tracks from the top_tracks table
    const { data: topTracks, error: tracksError } = await supabase
      .from('top_tracks')
      .select('*')
      .eq('artist_id', artistDetails.spotify_id || artistDetails.id)
      .limit(50);
    
    if (tracksError) {
      logError(results, "Artist Tracks", "Database", `Database error fetching tracks: ${tracksError.message}`, tracksError);
      throw tracksError;
    }
    
    if (topTracks && topTracks.length > 0) {
      logSuccess(results, "Artist Tracks", `Found ${topTracks.length} tracks in top_tracks table (Database)`, {
        trackCount: topTracks.length,
        firstTrackName: topTracks[0]?.name || 'N/A'
      });
      
      return topTracks;
    }
    
    // If no tracks found, create some mock tracks for testing
    const mockTracks = Array.from({ length: 10 }, (_, i) => ({
      id: `mock-track-${i}`,
      name: `${artistDetails.name} - Test Song ${i + 1}`,
      artist_id: artistDetails.id,
      popularity: Math.floor(Math.random() * 100),
      album_name: "Test Album",
      album_image_url: "https://example.com/image.jpg",
      preview_url: "",
      spotify_url: ""
    }));
    
    logSuccess(results, "Artist Tracks", `Created ${mockTracks.length} mock tracks for testing (Client)`, {
      trackCount: mockTracks.length,
      note: "Mock tracks created because no real tracks found"
    });
    
    return mockTracks;
  } catch (error) {
    logError(results, "Artist Tracks", "API/Database", `Error fetching artist tracks: ${(error as Error).message}`, error);
    
    // Return a small set of mock tracks to allow test to continue
    return Array.from({ length: 5 }, (_, i) => ({
      id: `mock-track-${i}`,
      name: `${artistDetails.name} - Emergency Mock Song ${i + 1}`,
      artist_id: artistDetails.id,
      album_name: "Test Album",
      album_image_url: "https://example.com/image.jpg",
      preview_url: "",
      spotify_url: ""
    }));
  }
}
