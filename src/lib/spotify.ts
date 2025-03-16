
import { toast } from "sonner";

// Spotify API credentials
const SPOTIFY_CLIENT_ID = "2946864dc822469b9c672292ead45f43";
const SPOTIFY_CLIENT_SECRET = "feaf0fc901124b839b11e02f97d18a8d";
const SPOTIFY_TOKEN_URL = "https://accounts.spotify.com/api/token";
const SPOTIFY_BASE_URL = "https://api.spotify.com/v1";

// Token caching
let accessToken: string | null = null;
let tokenExpiry: number | null = null;

/**
 * Gets a valid Spotify access token
 */
export async function getSpotifyToken(): Promise<string> {
  // Check if we have a valid cached token
  if (accessToken && tokenExpiry && Date.now() < tokenExpiry) {
    return accessToken;
  }

  try {
    // Request new token using client credentials flow
    const response = await fetch(SPOTIFY_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${btoa(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`)}`,
      },
      body: new URLSearchParams({
        grant_type: "client_credentials",
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to get Spotify access token");
    }

    const data = await response.json();
    accessToken = data.access_token;
    tokenExpiry = Date.now() + (data.expires_in * 1000 - 60000); // Subtract 1 minute for safety
    
    return accessToken;
  } catch (error) {
    console.error("Spotify token error:", error);
    toast.error("Spotify API connection error");
    throw error;
  }
}

/**
 * Search for artists on Spotify
 */
export async function searchArtists(query: string, limit = 10): Promise<any> {
  if (!query) return { artists: { items: [] } };
  
  try {
    const token = await getSpotifyToken();
    const response = await fetch(
      `${SPOTIFY_BASE_URL}/search?q=${encodeURIComponent(query)}&type=artist&limit=${limit}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error("Failed to search artists");
    }

    return response.json();
  } catch (error) {
    console.error("Artist search error:", error);
    toast.error("Failed to search artists");
    throw error;
  }
}

/**
 * Get artist details from Spotify
 */
export async function getArtistDetails(artistId: string): Promise<any> {
  try {
    const token = await getSpotifyToken();
    const response = await fetch(`${SPOTIFY_BASE_URL}/artists/${artistId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error("Failed to get artist details");
    }

    return response.json();
  } catch (error) {
    console.error("Artist details error:", error);
    toast.error("Failed to load artist details");
    throw error;
  }
}

/**
 * Get artist's top tracks from Spotify
 */
export async function getArtistTopTracks(artistId: string, market = "US"): Promise<any> {
  try {
    const token = await getSpotifyToken();
    const response = await fetch(
      `${SPOTIFY_BASE_URL}/artists/${artistId}/top-tracks?market=${market}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error("Failed to get artist top tracks");
    }

    return response.json();
  } catch (error) {
    console.error("Top tracks error:", error);
    toast.error("Failed to load top tracks");
    throw error;
  }
}
