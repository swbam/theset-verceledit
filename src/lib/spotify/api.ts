import { supabase } from '../db';

// Needed environment variables
const SPOTIFY_CLIENT_ID = process.env.VITE_SPOTIFY_CLIENT_ID || '';
const SPOTIFY_CLIENT_SECRET = process.env.VITE_SPOTIFY_CLIENT_SECRET || '';

// Token cache
let accessToken: string | null = null;
let tokenExpiry: number = 0;

/**
 * Get a Spotify access token using client credentials flow
 */
async function getAccessToken(): Promise<string> {
  // Check if we have a valid cached token
  if (accessToken && tokenExpiry > Date.now()) {
    return accessToken as string;
  }

  try {
    // First check if we have a valid token in the cache table
    const { data: cachedToken, error: cacheError } = await supabase
      .from('api_cache')
      .select('data, expires_at')
      .eq('cache_key', 'spotify_access_token')
      .single();

    if (!cacheError && cachedToken && new Date(cachedToken.expires_at) > new Date()) {
      accessToken = cachedToken.data.access_token;
      tokenExpiry = new Date(cachedToken.expires_at).getTime();
      return accessToken as string;
    }

    // If no valid token in cache, request a new one
    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString('base64')}`
      },
      body: 'grant_type=client_credentials'
    });

    if (!response.ok) {
      throw new Error(`Spotify token request failed: ${response.statusText}`);
    }

    const data = await response.json();
    accessToken = data.access_token;
    
    // Set expiry with a 5 minute buffer
    const expiresIn = data.expires_in * 1000; // convert to milliseconds
    tokenExpiry = Date.now() + expiresIn - 300000; // 5 minutes buffer
    
    // Store token in cache
    const expiryDate = new Date(tokenExpiry).toISOString();
    await supabase.from('api_cache').upsert({
      cache_key: 'spotify_access_token',
      data: { access_token: accessToken },
      expires_at: expiryDate,
      created_at: new Date().toISOString()
    });

    if (!accessToken) throw new Error("No Spotify access token received");
    return accessToken;
  } catch (error) {
    console.error('Error getting Spotify access token:', error);
    throw error;
  }
}

/**
 * Search for artists on Spotify
 */
export async function searchArtists(query: string, limit: number = 10): Promise<any[]> {
  try {
    const token = await getAccessToken();
    const response = await fetch(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=artist&limit=${limit}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Spotify search request failed: ${response.statusText}`);
    }

    const data = await response.json();
    return data.artists.items || [];
  } catch (error) {
    console.error('Error searching Spotify artists:', error);
    return [];
  }
}

/**
 * Get artist details from Spotify
 */
export async function getArtist(spotifyId: string): Promise<any | null> {
  try {
    const token = await getAccessToken();
    const response = await fetch(
      `https://api.spotify.com/v1/artists/${spotifyId}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Spotify artist request failed: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`Error getting Spotify artist ${spotifyId}:`, error);
    return null;
  }
}

/**
 * Get an artist's top tracks from Spotify
 */
export async function fetchArtistTopTracks(spotifyId: string, country: string = 'US'): Promise<any[]> {
  try {
    const token = await getAccessToken();
    const response = await fetch(
      `https://api.spotify.com/v1/artists/${spotifyId}/top-tracks?market=${country}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Spotify top tracks request failed: ${response.statusText}`);
    }

    const data = await response.json();
    return data.tracks || [];
  } catch (error) {
    console.error(`Error getting top tracks for artist ${spotifyId}:`, error);
    return [];
  }
}

/**
 * Get tracks for an album from Spotify
 */
export async function getAlbumTracks(albumId: string): Promise<any[]> {
  try {
    const token = await getAccessToken();
    const response = await fetch(
      `https://api.spotify.com/v1/albums/${albumId}/tracks?limit=50`,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Spotify album tracks request failed: ${response.statusText}`);
    }

    const data = await response.json();
    return data.items || [];
  } catch (error) {
    console.error(`Error getting tracks for album ${albumId}:`, error);
    return [];
  }
}

/**
 * Get several tracks by their IDs
 */
export async function getTracks(trackIds: string[]): Promise<any[]> {
  if (!trackIds.length) return [];
  
  try {
    const token = await getAccessToken();
    const response = await fetch(
      `https://api.spotify.com/v1/tracks?ids=${trackIds.join(',')}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Spotify tracks request failed: ${response.statusText}`);
    }

    const data = await response.json();
    return data.tracks || [];
  } catch (error) {
    console.error('Error getting Spotify tracks:', error);
    return [];
  }
}
