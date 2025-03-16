
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
      throw new Error(`Failed to get Spotify access token: ${response.status}`);
    }

    const data = await response.json();
    accessToken = data.access_token;
    tokenExpiry = Date.now() + (data.expires_in * 1000 - 60000); // Subtract 1 minute for safety
    
    return accessToken;
  } catch (error) {
    console.error("Spotify token error:", error);
    throw new Error("Failed to authenticate with Spotify API");
  }
}

/**
 * Generate mock tracks for an artist when API fails
 */
function generateMockTracks(artistName: string, count = 10) {
  const songTypes = ['Hit', 'Single', 'Remix', 'Live', 'Acoustic', 'Demo', 'Cover', 'Extended', 'Radio Edit', 'Club Mix'];
  const result = [];
  
  for (let i = 1; i <= count; i++) {
    const randomType = songTypes[Math.floor(Math.random() * songTypes.length)];
    result.push({
      id: `mock-${i}`,
      name: `${artistName} ${randomType} ${i}`,
      popularity: Math.floor(Math.random() * 100)
    });
  }
  
  // Sort by name for consistency
  return result.sort((a, b) => a.name.localeCompare(b.name));
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
      throw new Error(`Failed to search artists: ${response.status}`);
    }

    return response.json();
  } catch (error) {
    console.error("Artist search error:", error);
    toast.error("Failed to search artists");
    // Return empty results instead of throwing
    return { artists: { items: [] } };
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
      throw new Error(`Failed to get artist details: ${response.status}`);
    }

    return response.json();
  } catch (error) {
    console.error("Artist details error:", error);
    // Return mock data instead of throwing
    return {
      id: artistId,
      name: "Unknown Artist",
      genres: [],
      popularity: 50
    };
  }
}

/**
 * Get artist's top tracks from Spotify
 * Supports limiting the number of tracks returned
 */
export async function getArtistTopTracks(artistId: string, limit = 10, market = "US"): Promise<any> {
  // For demo purposes, return mock data for non-real Spotify IDs
  if (artistId.startsWith('spotify-') || artistId === 'demo-artist') {
    const mockTracks = generateMockTracks("Artist", 10);
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
      throw new Error(`Failed to get artist top tracks: ${response.status}`);
    }

    const data = await response.json();
    
    // Limit the number of tracks returned if specified
    if (data.tracks && limit > 0 && limit < data.tracks.length) {
      data.tracks = data.tracks.slice(0, limit);
    }

    return data;
  } catch (error) {
    console.error("Top tracks error:", error);
    
    // Get artist name if possible or use fallback
    let artistName = "Artist";
    try {
      const artistInfo = await getArtistDetails(artistId);
      artistName = artistInfo.name || "Artist";
    } catch {
      // Use default name if artist details can't be fetched
    }
    
    // Generate mock tracks for this artist
    const mockTracks = generateMockTracks(artistName, limit);
    return { tracks: mockTracks };
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
      tracks: generateMockTracks("Artist", 20)
    };
  }
  
  try {
    // Get artist name for generating fallback tracks if needed
    let artistName = "Artist";
    try {
      const artistInfo = await getArtistDetails(artistId);
      artistName = artistInfo.name || "Artist";
    } catch {
      // Use default name if artist details can't be fetched
    }
    
    // First get the artist's top tracks to ensure we have some data
    const topTracksResponse = await getArtistTopTracks(artistId, 50, market);
    
    // Try to get more tracks from albums if possible
    try {
      const token = await getSpotifyToken();
      
      // Get the artist's albums
      const albumsResponse = await fetch(
        `${SPOTIFY_BASE_URL}/artists/${artistId}/albums?include_groups=album,single&limit=20&market=${market}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!albumsResponse.ok) {
        // If albums can't be fetched, just return top tracks
        return topTracksResponse;
      }

      const albumsData = await albumsResponse.json();
      
      // Combine the tracks and remove duplicates
      const allTracks = [...(topTracksResponse.tracks || [])];
      const trackIds = new Set(allTracks.map((track: any) => track.id));
      
      // If we got some albums, fetch their tracks (limited to first 3 albums for performance)
      if (albumsData.items && albumsData.items.length > 0) {
        const limitedAlbums = albumsData.items.slice(0, 3);
        
        for (const album of limitedAlbums) {
          const tracksResponse = await fetch(
            `${SPOTIFY_BASE_URL}/albums/${album.id}/tracks?limit=20&market=${market}`,
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
      console.error("Error fetching all tracks:", error);
      console.log("Using top tracks as fallback");
      
      // If there was an error getting album tracks, just return top tracks
      // If top tracks failed too, generate mock data
      if (!topTracksResponse.tracks || topTracksResponse.tracks.length === 0) {
        return { tracks: generateMockTracks(artistName, 20) };
      }
      
      return topTracksResponse;
    }
  } catch (error) {
    console.error("All tracks error:", error);
    
    // Get artist name for mock tracks
    let artistName = "Artist";
    try {
      const artistInfo = await getArtistDetails(artistId);
      artistName = artistInfo.name || "Artist";
    } catch {
      // Use default name if artist details can't be fetched
    }
    
    // Generate mock data if everything fails
    return { tracks: generateMockTracks(artistName, 20) };
  }
}
