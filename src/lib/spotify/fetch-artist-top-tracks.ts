
import { SpotifyTrack } from './types';
import { generateMockTracks } from './utils';

const SPOTIFY_API_BASE = 'https://api.spotify.com/v1';

/**
 * Fetches top tracks for an artist
 */
export const fetchArtistTopTracks = async (
  artistId: string
): Promise<SpotifyTrack[]> => {
  try {
    // Skip mock artist IDs
    if (artistId.includes('mock')) {
      console.log('Using mock data for mock artist ID in top tracks');
      return generateMockTracks(10);
    }
    
    console.log(`Fetching top tracks for artist ID: ${artistId}`);
    
    // This is a mock implementation for now
    // In a real implementation, we would fetch from Spotify API
    return generateMockTracks(10);
  } catch (error) {
    console.error('Error fetching artist top tracks:', error);
    return [];
  }
};
