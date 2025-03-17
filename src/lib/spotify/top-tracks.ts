
import { fetchArtistTopTracks } from './fetch-artist-top-tracks';
import { generateMockTracks } from './utils';
import { 
  getStoredTracksFromDb, 
  saveTracksToDb, 
  getArtistTopTracksFromDb,
  checkArtistTracksNeedUpdate
} from './utils';
import { SpotifyTrack } from './types';

export async function getArtistTopTracks(artistId: string, limit: number = 10): Promise<{ tracks: SpotifyTrack[] }> {
  try {
    console.log(`Fetching top ${limit} tracks for artist ID: ${artistId}`);
    
    // First check if we already have stored tracks
    const storedTracks = await getArtistTopTracksFromDb(artistId, limit);
    
    // Check if we need to update the artist's tracks
    const needsUpdate = await checkArtistTracksNeedUpdate(artistId);
    
    if (storedTracks && storedTracks.length > 0 && !needsUpdate) {
      console.log(`Using ${storedTracks.length} cached top tracks for artist ${artistId}`);
      return { tracks: storedTracks };
    }
    
    // If no stored tracks or update needed, fetch from Spotify
    console.log(`Fetching fresh tracks from Spotify for artist ${artistId}`);
    const fetchedTracks = await fetchArtistTopTracks(artistId);
    
    if (fetchedTracks && fetchedTracks.length > 0) {
      console.log(`Fetched ${fetchedTracks.length} top tracks from Spotify API`);
      
      // Save tracks to database for future use
      await saveTracksToDb(artistId, fetchedTracks);
      
      // Return the top tracks limited to the requested amount
      const sortedTracks = [...fetchedTracks].sort((a, b) => 
        (b.popularity || 0) - (a.popularity || 0)
      );
      
      return { tracks: sortedTracks.slice(0, limit) };
    }
    
    // If we still have some stored tracks but they're outdated, use them anyway
    if (storedTracks && storedTracks.length > 0) {
      console.log(`Using ${storedTracks.length} outdated top tracks for artist ${artistId}`);
      return { tracks: storedTracks };
    }
    
    console.log("No tracks found in database or Spotify, using mock data");
    return { tracks: generateMockTracks(limit) };
  } catch (error) {
    console.error("Error in getArtistTopTracks:", error);
    console.log("Falling back to mock data");
    return { tracks: generateMockTracks(limit) };
  }
}
