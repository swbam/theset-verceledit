import { getAccessToken } from './auth';
import { SpotifyTrack } from './types';

const SPOTIFY_API_BASE = 'https://api.spotify.com/v1';

/**
 * Fetches top tracks for an artist from Spotify API
 */
export const fetchArtistTopTracksFromSpotify = async (
  artistId: string
): Promise<SpotifyTrack[]> => {
  try {
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
        next: { revalidate: 86400 }, // Cache for 24 hours
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
    throw error; // Re-throw the error to be handled by the caller
  }
};
