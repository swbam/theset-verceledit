
import { fetchArtistTopTracks } from './fetch-artist-top-tracks';
import { generateMockTracks } from './utils';
import { getStoredTracksFromDb, saveTracksToDb } from './utils';
import { SpotifyTrack } from './types';

export async function getArtistTopTracks(artistId: string, limit: number = 10): Promise<{ tracks: SpotifyTrack[] }> {
  try {
    console.log(`Fetching top ${limit} tracks for artist ID: ${artistId}`);
    
    // First check if we have stored tracks
    const storedTracks = await getStoredTracksFromDb(artistId);
    if (storedTracks && storedTracks.length > 0) {
      console.log(`Found ${storedTracks.length} stored tracks for artist ${artistId}`);
      
      // Sort stored tracks by popularity to get true top tracks
      const sortedTracks = [...storedTracks].sort((a, b) => 
        (b.popularity || 0) - (a.popularity || 0)
      );
      
      const topTracks = sortedTracks.slice(0, limit);
      console.log(`Using ${topTracks.length} most popular tracks from stored collection`);
      return { tracks: topTracks };
    }
    
    // If no stored tracks, fetch from Spotify
    const fetchedTracks = await fetchArtistTopTracks(artistId);
    if (fetchedTracks && fetchedTracks.length > 0) {
      console.log(`Fetched ${fetchedTracks.length} top tracks from Spotify API`);
      
      // Save tracks to database for future use
      await saveTracksToDb(artistId, fetchedTracks);
      
      return { tracks: fetchedTracks.slice(0, limit) };
    }
    
    console.log("No tracks found in database or Spotify, using mock data");
    return { tracks: generateMockTracks(limit) };
  } catch (error) {
    console.error("Error in getArtistTopTracks:", error);
    console.log("Falling back to mock data");
    return { tracks: generateMockTracks(limit) };
  }
}
