
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

// API endpoints
const SPOTIFY_API_BASE = 'https://api.spotify.com/v1';

// Mock some data for development/fallback
const mockTopTracks = [
  { id: '1', name: 'Yellow', popularity: 85 },
  { id: '2', name: 'Viva La Vida', popularity: 89 },
  { id: '3', name: 'The Scientist', popularity: 83 },
  { id: '4', name: 'Fix You', popularity: 87 },
  { id: '5', name: 'Paradise', popularity: 82 },
  { id: '6', name: 'A Sky Full of Stars', popularity: 84 },
  { id: '7', name: 'Adventure of a Lifetime', popularity: 78 },
  { id: '8', name: 'Clocks', popularity: 79 },
  { id: '9', name: 'Something Just Like This', popularity: 85 },
  { id: '10', name: 'Higher Power', popularity: 75 },
];

// Authentication token management
let accessToken: string | null = null;
let tokenExpiry: number | null = null;

const getAccessToken = async (): Promise<string | null> => {
  try {
    // Check if we have a valid token
    if (accessToken && tokenExpiry && Date.now() < tokenExpiry) {
      return accessToken;
    }
    
    // This would typically be handled by a backend endpoint
    // For demo purposes, we'll use the client credentials flow with hardcoded values
    const SPOTIFY_CLIENT_ID = '2946864dc822469b9c672292ead45f43';
    const SPOTIFY_CLIENT_SECRET = 'feaf0fc901124b839b11e02f97d18a8d';
    
    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${btoa(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`)}`
      },
      body: new URLSearchParams({
        'grant_type': 'client_credentials'
      })
    });
    
    if (!response.ok) {
      console.error('Failed to get Spotify token:', await response.text());
      throw new Error('Failed to authenticate with Spotify');
    }
    
    const data = await response.json();
    accessToken = data.access_token;
    tokenExpiry = Date.now() + (data.expires_in * 1000);
    
    return accessToken;
  } catch (error) {
    console.error('Error getting Spotify access token:', error);
    return null;
  }
};

// API request wrapper
const spotifyApi = async (endpoint: string, method: string = 'GET', useAuth: boolean = true): Promise<any> => {
  try {
    let headers: HeadersInit = {
      'Content-Type': 'application/json'
    };
    
    if (useAuth) {
      const token = await getAccessToken();
      if (!token) {
        throw new Error('No access token available');
      }
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    const response = await fetch(`${SPOTIFY_API_BASE}${endpoint}`, {
      method,
      headers
    });
    
    if (!response.ok) {
      console.error(`Spotify API error (${response.status}):`, await response.text());
      throw new Error(`Spotify API error: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Spotify API request failed:', error);
    throw error;
  }
};

// Get a Spotify Artist ID from a Ticketmaster Artist ID or name
export const resolveArtistId = async (ticketmasterId: string, artistName: string): Promise<string> => {
  try {
    console.log(`Resolving Spotify ID for artist: ${artistName} (Ticketmaster ID: ${ticketmasterId})`);
    
    // Try to fetch from database first
    const { data: artistData, error } = await supabase
      .from('artists')
      .select('id, spotify_id')
      .eq('ticketmaster_id', ticketmasterId)
      .maybeSingle();
    
    if (error) {
      console.error("Error fetching artist from database:", error);
    }
    
    // If we have a Spotify ID in the database, return it
    if (artistData?.spotify_id) {
      console.log(`Found cached Spotify ID: ${artistData.spotify_id}`);
      return artistData.spotify_id;
    }
    
    // Search Spotify for the artist
    const searchResult = await spotifyApi(`/search?q=${encodeURIComponent(artistName)}&type=artist&limit=1`);
    
    if (searchResult.artists && searchResult.artists.items && searchResult.artists.items.length > 0) {
      const spotifyId = searchResult.artists.items[0].id;
      console.log(`Found Spotify ID: ${spotifyId}`);
      
      // Store the Spotify ID in the database for future use
      const { error: upsertError } = await supabase
        .from('artists')
        .upsert({
          id: spotifyId,
          name: artistName,
          ticketmaster_id: ticketmasterId,
          spotify_id: spotifyId,
          updated_at: new Date().toISOString()
        });
        
      if (upsertError) {
        console.error("Error storing artist in database:", upsertError);
      }
      
      return spotifyId;
    } else {
      console.warn(`No Spotify artist found for: ${artistName}`);
      throw new Error(`No Spotify artist found for: ${artistName}`);
    }
  } catch (error) {
    console.error("Error resolving artist ID:", error);
    toast.error(`Could not find artist "${artistName}" on Spotify`);
    // Return a fallback ID for the mock data
    return "4gzpq5DPGxSnKTe4SA8HAU"; // Coldplay's Spotify ID as fallback
  }
};

// Get artist's top tracks
export const getArtistTopTracks = async (artistId: string, limit: number = 5): Promise<any> => {
  try {
    console.log(`Fetching top ${limit} tracks for artist ID: ${artistId}`);
    const data = await spotifyApi(`/artists/${artistId}/top-tracks?market=US`);
    
    if (data && data.tracks) {
      console.log(`Successfully fetched ${data.tracks.length} top tracks`);
      // Sort tracks by popularity (highest first)
      const sortedTracks = data.tracks
        .sort((a: any, b: any) => b.popularity - a.popularity)
        .slice(0, limit);
      
      console.log("Top tracks:", sortedTracks.map((t: any) => t.name));
      return { tracks: sortedTracks };
    } else {
      throw new Error("No tracks found in response");
    }
  } catch (error) {
    console.error("Error fetching artist top tracks:", error);
    // Return mock data
    console.log("Returning mock top tracks");
    return { tracks: mockTopTracks.slice(0, limit) };
  }
};

// Get all tracks for an artist
export const getArtistAllTracks = async (artistId: string): Promise<any> => {
  try {
    console.log(`Fetching all tracks for artist ID: ${artistId}`);
    
    // First, get albums by the artist
    const albumsData = await spotifyApi(`/artists/${artistId}/albums?include_groups=album,single&limit=50`);
    
    if (!albumsData || !albumsData.items || albumsData.items.length === 0) {
      throw new Error("No albums found");
    }
    
    // Get all tracks from each album
    const albumIds = albumsData.items.map((album: any) => album.id);
    
    // Fetch tracks for each album (may need to batch requests if there are many albums)
    const batchSize = 20; // Spotify API limit
    const allTracks: any[] = [];
    
    for (let i = 0; i < albumIds.length; i += batchSize) {
      const batch = albumIds.slice(i, i + batchSize);
      
      for (const albumId of batch) {
        const tracksData = await spotifyApi(`/albums/${albumId}/tracks?limit=50`);
        
        if (tracksData && tracksData.items) {
          // Add album tracks to the collection
          allTracks.push(...tracksData.items);
        }
      }
    }
    
    if (allTracks.length === 0) {
      throw new Error("No tracks found across all albums");
    }
    
    // Remove duplicates (same track name)
    const uniqueTracks = allTracks.reduce((unique: any[], track: any) => {
      const exists = unique.some(t => t.name.toLowerCase() === track.name.toLowerCase());
      if (!exists) {
        unique.push(track);
      }
      return unique;
    }, []);
    
    // Sort tracks alphabetically by name
    const sortedTracks = uniqueTracks.sort((a: any, b: any) => 
      a.name.localeCompare(b.name)
    );
    
    console.log(`Successfully fetched ${sortedTracks.length} unique tracks`);
    return { tracks: sortedTracks };
  } catch (error) {
    console.error("Error fetching all artist tracks:", error);
    // Return expanded mock data
    console.log("Returning mock tracks");
    return { tracks: mockTopTracks.sort((a, b) => a.name.localeCompare(b.name)) };
  }
};
