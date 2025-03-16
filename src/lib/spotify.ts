
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
 * Search for artists on Spotify using their name
 */
export async function searchArtistsByName(name: string): Promise<string | null> {
  if (!name) return null;
  
  try {
    const token = await getSpotifyToken();
    const response = await fetch(
      `${SPOTIFY_BASE_URL}/search?q=${encodeURIComponent(name)}&type=artist&limit=1`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to search artists: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.artists && data.artists.items && data.artists.items.length > 0) {
      return data.artists.items[0].id;
    }
    
    return null;
  } catch (error) {
    console.error("Artist search error:", error);
    toast.error("Failed to find artist on Spotify");
    return null;
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
  if (!artistId) {
    console.error("No artist ID provided");
    return {
      id: "unknown",
      name: "Unknown Artist",
      genres: [],
      popularity: 50
    };
  }
  
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
 * Resolve Ticketmaster artist ID to Spotify artist ID if needed
 */
export async function resolveArtistId(artistId: string, artistName?: string): Promise<string> {
  // If it's already a valid Spotify ID (not starting with K or tm-), return it
  if (artistId && !artistId.startsWith('K') && !artistId.startsWith('tm-')) {
    return artistId;
  }
  
  // If we have an artist name, try to search for it on Spotify
  if (artistName) {
    console.log(`Searching for Spotify ID for artist: ${artistName}`);
    const spotifyId = await searchArtistsByName(artistName);
    if (spotifyId) {
      console.log(`Found Spotify ID for ${artistName}: ${spotifyId}`);
      return spotifyId;
    }
  }
  
  // If we couldn't find a Spotify ID, log the issue but return the original ID
  console.warn(`Could not resolve Spotify ID for artist: ${artistId} (${artistName || 'unknown'})`);
  return artistId;
}

/**
 * Get artist's top tracks from Spotify
 * Supports limiting the number of tracks returned
 */
export async function getArtistTopTracks(artistId: string, limit = 10, market = "US"): Promise<any> {
  if (!artistId) {
    console.error("No artist ID provided to getArtistTopTracks");
    return { tracks: [] };
  }
  
  try {
    // Get Spotify token
    const token = await getSpotifyToken();
    
    // Try to make the API call
    console.log(`Fetching top tracks for artist ID: ${artistId}`);
    const response = await fetch(
      `${SPOTIFY_BASE_URL}/artists/${artistId}/top-tracks?market=${market}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    // Handle non-successful responses properly
    if (!response.ok) {
      const errorDetails = await response.text();
      console.error(`API returned ${response.status}: ${errorDetails}`);
      throw new Error(`Failed to get artist top tracks: ${response.status}`);
    }

    // Parse the successful response
    const data = await response.json();
    console.log(`Retrieved ${data.tracks?.length || 0} top tracks for artist`);
    
    // Limit the number of tracks returned if specified
    if (data.tracks && limit > 0 && limit < data.tracks.length) {
      data.tracks = data.tracks.slice(0, limit);
    }

    return data;
  } catch (error) {
    console.error("Top tracks error:", error);
    console.log("Returning empty track list due to error");
    return { tracks: [] };
  }
}

/**
 * Get all tracks for an artist from Spotify
 * This is a simplified implementation - in a real app, this would fetch from multiple endpoints
 * and handle pagination to get a more comprehensive list
 */
export async function getArtistAllTracks(artistId: string, market = "US"): Promise<any> {
  if (!artistId) {
    console.error("No artist ID provided to getArtistAllTracks");
    return { tracks: [] };
  }
  
  try {
    // Get artist name for generating fallback tracks if needed
    let artistName = "Unknown Artist";
    try {
      const artistInfo = await getArtistDetails(artistId);
      artistName = artistInfo.name || "Unknown Artist";
    } catch {
      // Use default name if artist details can't be fetched
    }
    
    // First get the artist's top tracks to ensure we have some data
    console.log(`Getting all tracks for artist ID: ${artistId}`);
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
        console.log("Could not fetch albums, using top tracks only");
        return topTracksResponse;
      }

      const albumsData = await albumsResponse.json();
      console.log(`Retrieved ${albumsData.items?.length || 0} albums for artist`);
      
      // Combine the tracks and remove duplicates
      const allTracks = [...(topTracksResponse.tracks || [])];
      const trackIds = new Set(allTracks.map((track: any) => track.id));
      
      // If we got some albums, fetch their tracks (limited to first 3 albums for performance)
      if (albumsData.items && albumsData.items.length > 0) {
        const limitedAlbums = albumsData.items.slice(0, 3);
        
        for (const album of limitedAlbums) {
          console.log(`Fetching tracks for album: ${album.name}`);
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
            console.log(`Retrieved ${albumTracks.items?.length || 0} tracks from album ${album.name}`);
            
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
      console.log(`Total unique tracks found: ${allTracks.length}`);
      
      return { tracks: allTracks };
    } catch (error) {
      console.error("Error fetching all tracks:", error);
      console.log("Using top tracks as fallback");
      
      // If there was an error getting album tracks, just return top tracks
      if (!topTracksResponse.tracks || topTracksResponse.tracks.length === 0) {
        console.error("No tracks could be retrieved for artist");
        return { tracks: [] };
      }
      
      return topTracksResponse;
    }
  } catch (error) {
    console.error("All tracks error:", error);
    console.log("Returning empty track list due to error");
    return { tracks: [] };
  }
}

/**
 * Get tracks from stored artist data if available, or fetch from Spotify API
 */
export async function getArtistTracksFromDatabase(artistId: string): Promise<any[]> {
  if (!artistId) {
    console.error("No artist ID provided to getArtistTracksFromDatabase");
    return [];
  }
  
  try {
    // Query the Supabase database for the artist's stored tracks
    const { data, error } = await supabase
      .from('artists')
      .select('stored_tracks')
      .eq('id', artistId)
      .maybeSingle();
    
    if (error) {
      console.error("Error fetching stored tracks from database:", error);
      return [];
    }
    
    if (data && data.stored_tracks && Array.isArray(data.stored_tracks)) {
      console.log(`Retrieved ${data.stored_tracks.length} stored tracks from database for artist ${artistId}`);
      return data.stored_tracks;
    }
    
    return [];
  } catch (error) {
    console.error("Database tracks error:", error);
    return [];
  }
}
