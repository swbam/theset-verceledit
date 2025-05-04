import { serverConfig } from '@/integrations/config';
import { SpotifyArtist, SpotifyTrack, SpotifyTracksResponse } from './types';
import { getClientCredentialsToken } from './auth'; // Assuming a server-side auth function exists or will be created

const SPOTIFY_API_BASE = 'https://api.spotify.com/v1';

/**
 * Fetches Spotify API using client credentials flow (Server-Side).
 */
async function fetchSpotifyServerApi<T>(endpoint: string): Promise<T | null> {
  try {
    const token = await getClientCredentialsToken(); // Use server-side token
    if (!token) {
      throw new Error('Failed to get Spotify client credentials token');
    }

    const response = await fetch(`${SPOTIFY_API_BASE}/${endpoint}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      if (response.status === 404) return null; // Not found
      const errorText = await response.text();
      console.error(`Spotify Server API error (${response.status}) for ${endpoint}:`, errorText);
      throw new Error(`Failed to fetch ${endpoint}: ${response.statusText}`);
    }

    const data: T = await response.json();
    return data;
  } catch (error) {
    console.error(`Error fetching Spotify Server API endpoint '${endpoint}':`, error);
    // Consider more specific error handling or logging
    return null;
  }
}

/**
 * Get artist details by ID (Server-Side).
 */
export const getArtistByIdServer = async (artistId: string): Promise<SpotifyArtist | null> => {
  return fetchSpotifyServerApi<SpotifyArtist>(`artists/${artistId}`);
};

/**
 * Get artist's top tracks by ID (Server-Side).
 * Note: Spotify API provides this directly, no need to fetch all tracks first like the client-side version.
 */
export const getArtistTopTracksServer = async (artistId: string, market: string = 'US', limit: number = 10): Promise<SpotifyTrack[]> => {
  const response = await fetchSpotifyServerApi<{ tracks: SpotifyTrack[] }>(`artists/${artistId}/top-tracks?market=${market}&limit=${limit}`);
  return response?.tracks || [];
};

// Add other necessary server-side Spotify functions here...