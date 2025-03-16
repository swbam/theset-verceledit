
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
 * Supports limiting the number of tracks returned
 */
export async function getArtistTopTracks(artistId: string, limit = 10, market = "US"): Promise<any> {
  // For demo purposes, return mock data for non-real Spotify IDs
  if (artistId.startsWith('spotify-') || artistId === 'demo-artist') {
    const mockTracks = [
      { id: 'track1', name: 'Greatest Hit' },
      { id: 'track2', name: 'Fan Favorite' },
      { id: 'track3', name: 'Chart Topper' },
      { id: 'track4', name: 'Classic Track' },
      { id: 'track5', name: 'New Single' },
      { id: 'track6', name: 'Deep Cut' },
      { id: 'track7', name: 'B-Side' },
      { id: 'track8', name: 'Ballad' },
      { id: 'track9', name: 'Upbeat Number' },
      { id: 'track10', name: 'Encore Song' },
    ];
    
    return {
      tracks: mockTracks.slice(0, limit)
    };
  }
  
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

    const data = await response.json();
    
    // Limit the number of tracks returned if specified
    if (data.tracks && limit > 0 && limit < data.tracks.length) {
      data.tracks = data.tracks.slice(0, limit);
    }

    return data;
  } catch (error) {
    console.error("Top tracks error:", error);
    toast.error("Failed to load top tracks");
    throw error;
  }
}

/**
 * Get all tracks for an artist from Spotify
 * This is a simplified implementation - in a real app, this would fetch from multiple endpoints
 * and handle pagination to get a more comprehensive list
 */
export async function getArtistAllTracks(artistId: string, market = "US"): Promise<any> {
  // For demo purposes, return mock data for non-real Spotify IDs
  if (artistId.startsWith('spotify-') || artistId === 'demo-artist') {
    return {
      tracks: [
        { id: 'track1', name: 'Greatest Hit' },
        { id: 'track2', name: 'Fan Favorite' },
        { id: 'track3', name: 'Chart Topper' },
        { id: 'track4', name: 'Classic Track' },
        { id: 'track5', name: 'New Single' },
        { id: 'track6', name: 'Deep Cut' },
        { id: 'track7', name: 'B-Side' },
        { id: 'track8', name: 'Ballad' },
        { id: 'track9', name: 'Upbeat Number' },
        { id: 'track10', name: 'Encore Song' },
        { id: 'track11', name: 'Album Track 1' },
        { id: 'track12', name: 'Album Track 2' },
        { id: 'track13', name: 'Album Track 3' },
        { id: 'track14', name: 'Album Track 4' },
        { id: 'track15', name: 'Album Track 5' },
        { id: 'track16', name: 'Bonus Track' },
        { id: 'track17', name: 'Live Version' },
        { id: 'track18', name: 'Acoustic Version' },
        { id: 'track19', name: 'Remix' },
        { id: 'track20', name: 'Collaboration' },
      ].sort((a, b) => a.name.localeCompare(b.name)) // Sort alphabetically
    };
  }
  
  try {
    // In a real implementation, we would fetch tracks from albums, singles, etc.
    // For now, we'll use the artist's top tracks as a sample and add some additional mock tracks
    const token = await getSpotifyToken();
    
    // First get the artist's albums
    const albumsResponse = await fetch(
      `${SPOTIFY_BASE_URL}/artists/${artistId}/albums?include_groups=album,single&limit=50&market=${market}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!albumsResponse.ok) {
      throw new Error("Failed to get artist albums");
    }

    const albumsData = await albumsResponse.ok ? await albumsResponse.json() : { items: [] };
    
    // Also get top tracks to ensure we have some data
    const topTracksResponse = await fetch(
      `${SPOTIFY_BASE_URL}/artists/${artistId}/top-tracks?market=${market}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const topTracksData = topTracksResponse.ok ? await topTracksResponse.json() : { tracks: [] };
    
    // Combine the tracks and remove duplicates
    const allTracks = [...topTracksData.tracks];
    const trackIds = new Set(allTracks.map((track: any) => track.id));
    
    // If we got some albums, fetch their tracks (limited to first 3 albums for performance)
    if (albumsData.items && albumsData.items.length > 0) {
      const limitedAlbums = albumsData.items.slice(0, 3);
      
      for (const album of limitedAlbums) {
        const tracksResponse = await fetch(
          `${SPOTIFY_BASE_URL}/albums/${album.id}/tracks?limit=50&market=${market}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        
        if (tracksResponse.ok) {
          const albumTracks = await tracksResponse.json();
          
          // Add tracks that aren't already in our collection
          for (const track of albumTracks.items) {
            if (!trackIds.has(track.id)) {
              allTracks.push(track);
              trackIds.add(track.id);
            }
          }
        }
      }
    }
    
    // Sort alphabetically
    allTracks.sort((a: any, b: any) => a.name.localeCompare(b.name));
    
    return { tracks: allTracks };
  } catch (error) {
    console.error("All tracks error:", error);
    // Don't show error toast for this since it's supplementary data
    console.log("Using top tracks as fallback");
    
    // Fallback to top tracks if we can't get all tracks
    return getArtistTopTracks(artistId, 50, market);
  }
}
