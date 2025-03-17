
import { getAccessToken } from './auth';
import { SpotifyTrack } from './types';
import { generateMockTracks } from './utils';

const SPOTIFY_API_BASE = 'https://api.spotify.com/v1';

/**
 * Fetches top tracks for an artist from Spotify API
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
    
    console.log(`Fetching real top tracks for artist ID: ${artistId}`);
    
    // Get access token
    const token = await getAccessToken();
    
    // Request top tracks from Spotify
    const response = await fetch(
      `${SPOTIFY_API_BASE}/artists/${artistId}/top-tracks?market=US`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    
    if (!response.ok) {
      throw new Error(`Failed to fetch top tracks: ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log(`Received ${data.tracks?.length || 0} top tracks from Spotify API`);
    
    // Map to our SpotifyTrack format
    const tracks = data.tracks.map((track: any): SpotifyTrack => ({
      id: track.id,
      name: track.name,
      album: {
        name: track.album?.name,
        images: track.album?.images || []
      },
      artists: track.artists,
      uri: track.uri,
      duration_ms: track.duration_ms,
      popularity: track.popularity,
      preview_url: track.preview_url
    }));
    
    return tracks;
  } catch (error) {
    console.error('Error fetching artist top tracks:', error);
    console.log('Falling back to mock data for top tracks');
    return generateMockTracks(10);
  }
};
