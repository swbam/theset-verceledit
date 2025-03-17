
import { SpotifyTrack } from './types';
import { generateMockTracks } from './mock-tracks';

const SPOTIFY_API_BASE = 'https://api.spotify.com/v1';

/**
 * Fetches top tracks for an artist
 */
export const fetchArtistTopTracks = async (
  artistId: string, 
  token: string
): Promise<SpotifyTrack[]> => {
  try {
    // Skip mock artist IDs
    if (artistId.includes('mock')) {
      console.log('Using mock data for mock artist ID in top tracks');
      return generateMockTracks(artistId, 10).tracks;
    }
    
    console.log(`Fetching top tracks for artist ID: ${artistId}`);
    const topTracksResponse = await fetch(
      `${SPOTIFY_API_BASE}/artists/${artistId}/top-tracks?market=US`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    
    // Handle rate limiting - if we get a 429, return empty array
    if (topTracksResponse.status === 429) {
      console.warn("Rate limited by Spotify API (429) when fetching top tracks.");
      return [];
    }

    if (!topTracksResponse.ok) {
      console.error(`Failed to get top tracks: ${topTracksResponse.statusText}`);
      return [];
    }
    
    const topTracksData = await topTracksResponse.json();
    
    if (!topTracksData.tracks || !Array.isArray(topTracksData.tracks)) {
      console.error('Invalid tracks data received from Spotify API');
      return [];
    }
    
    console.log(`Received ${topTracksData.tracks.length} top tracks from Spotify API`);
    
    const tracks = topTracksData.tracks.map((track: any) => ({
      id: track.id,
      name: track.name,
      duration_ms: track.duration_ms,
      popularity: track.popularity,
      preview_url: track.preview_url,
      uri: track.uri,
      album: track.album?.name || 'Unknown Album',
      votes: 0
    }));
    
    return tracks;
  } catch (error) {
    console.error('Error fetching artist top tracks:', error);
    return [];
  }
};
