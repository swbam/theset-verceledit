
import { fetchArtistTopTracks } from './fetch-artist-top-tracks';
import { generateMockTracks } from './utils';
import { convertStoredTracks } from './utils';
import { getStoredTracksFromDb } from './utils';
import { SpotifyTrack } from './types';

export async function getArtistTopTracks(artistId: string, limit: number = 10) {
  try {
    console.log(`Fetching top ${limit} tracks for artist ID: ${artistId}`);
    
    // First check if we have stored tracks
    const storedTracks = await getStoredTracksFromDb(artistId);
    if (storedTracks && storedTracks.length > 0) {
      console.log(`Found ${storedTracks.length} stored tracks for artist ${artistId}`);
      const tracks = storedTracks.slice(0, limit);
      return convertStoredTracks(tracks);
    }
    
    // If no stored tracks, fetch from Spotify
    const tracks = await fetchArtistTopTracks(artistId);
    if (tracks && tracks.length > 0) {
      console.log(`Fetched ${tracks.length} top tracks from Spotify`);
      return { tracks: tracks.slice(0, limit) };
    }
    
    console.log("No tracks found in database or Spotify, using mock data");
    return { tracks: generateMockTracks(limit) };
  } catch (error) {
    console.error("Error in getArtistTopTracks:", error);
    console.log("Falling back to mock data");
    return { tracks: generateMockTracks(limit) };
  }
}
