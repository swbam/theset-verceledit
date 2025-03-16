import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const SPOTIFY_API_BASE = 'https://api.spotify.com/v1';
const SPOTIFY_CLIENT_ID = import.meta.env.VITE_SPOTIFY_CLIENT_ID || '2946864dc822469b9c672292ead45f43';
const SPOTIFY_CLIENT_SECRET = import.meta.env.VITE_SPOTIFY_CLIENT_SECRET || 'feaf0fc901124b839b11e02f97d18a8d';

let accessToken: string | null = null;
let tokenExpirationTime: number | null = null;

// Get Spotify API token using client credentials flow
const getAccessToken = async (): Promise<string> => {
  // If we have a valid token, return it
  if (accessToken && tokenExpirationTime && Date.now() < tokenExpirationTime) {
    return accessToken;
  }

  try {
    // Otherwise, request a new token
    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${btoa(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`)}`,
      },
      body: 'grant_type=client_credentials',
    });

    if (!response.ok) {
      throw new Error(`Failed to get Spotify access token: ${response.statusText}`);
    }

    const data = await response.json();
    accessToken = data.access_token;
    tokenExpirationTime = Date.now() + (data.expires_in * 1000);
    
    return accessToken;
  } catch (error) {
    console.error('Error getting Spotify access token:', error);
    throw error;
  }
};

// Function to search for artists
export const searchArtists = async (query: string, limit = 5): Promise<any> => {
  if (!query.trim()) return { artists: { items: [] } };
  
  try {
    const token = await getAccessToken();
    const response = await fetch(
      `${SPOTIFY_API_BASE}/search?q=${encodeURIComponent(query)}&type=artist&limit=${limit}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to search artists: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error searching artists:', error);
    return { artists: { items: [] } };
  }
};

// Get artist info by name
export const getArtistByName = async (name: string): Promise<any> => {
  try {
    const token = await getAccessToken();
    const response = await fetch(
      `${SPOTIFY_API_BASE}/search?q=${encodeURIComponent(name)}&type=artist&limit=1`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to search artist: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (data.artists.items.length === 0) {
      throw new Error(`No artist found with name: ${name}`);
    }
    
    return data.artists.items[0];
  } catch (error) {
    console.error('Error searching for artist:', error);
    throw error;
  }
};

// Function to get artist by ID
export const getArtistById = async (artistId: string): Promise<any> => {
  try {
    const token = await getAccessToken();
    const response = await fetch(`${SPOTIFY_API_BASE}/artists/${artistId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to get artist: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error getting artist by ID:', error);
    throw error;
  }
};

// Function to resolve artist ID (from database or Spotify search)
export const resolveArtistId = async (artistId: string, artistName: string): Promise<string> => {
  try {
    // First, check if we have this artist in our database
    const { data: artistData, error } = await supabase
      .from('artists')
      .select('*')
      .eq('id', artistId)
      .single();

    if (!error && artistData && artistData.stored_tracks) {
      // If we have stored tracks, use this artist's ID
      console.log("Found artist with stored tracks in DB:", artistData);
      return artistData.id;
    }

    // If not found or no stored tracks, search Spotify for the artist
    const spotifyArtist = await getArtistByName(artistName);
    
    // Update or insert the artist with the Spotify ID
    if (spotifyArtist && spotifyArtist.id) {
      if (artistData) {
        // Update existing artist
        await supabase
          .from('artists')
          .update({ 
            image: spotifyArtist.images?.[0]?.url,
          })
          .eq('id', artistId);
        
        return artistId;
      } else {
        // Insert new artist
        const { data: newArtist, error: insertError } = await supabase
          .from('artists')
          .insert({
            id: artistId,
            name: artistName,
            image: spotifyArtist.images?.[0]?.url,
          })
          .select()
          .single();
        
        if (insertError) {
          console.error("Error inserting artist:", insertError);
          throw insertError;
        }
        
        return artistId;
      }
    }
    
    throw new Error(`Could not resolve artist ID for: ${artistName}`);
  } catch (error) {
    console.error('Error resolving artist ID:', error);
    toast.error("Error finding artist information");
    throw error;
  }
};

// Get top tracks for an artist
export const getArtistTopTracks = async (artistId: string, limit = 10): Promise<{ tracks: any[] }> => {
  try {
    // Check if we have stored tracks in the database
    const { data: artistData, error } = await supabase
      .from('artists')
      .select('stored_tracks')
      .eq('id', artistId)
      .maybeSingle();
    
    if (!error && artistData && artistData.stored_tracks && Array.isArray(artistData.stored_tracks) && artistData.stored_tracks.length > 0) {
      console.log("Using stored tracks from database");
      // Return stored tracks sorted by name
      return { 
        tracks: artistData.stored_tracks
          .slice(0, limit)
          .sort((a: any, b: any) => a.name.localeCompare(b.name))
      };
    }
    
    // If no stored tracks, get artist details from Spotify API
    console.log("Fetching tracks from Spotify API");
    const token = await getAccessToken();
    const response = await fetch(
      `${SPOTIFY_API_BASE}/artists/${artistId}/top-tracks?market=US`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to get top tracks: ${response.statusText}`);
    }

    const data = await response.json();
    const tracks = data.tracks.map((track: any) => ({
      id: track.id,
      name: track.name,
      duration_ms: track.duration_ms,
      popularity: track.popularity,
      preview_url: track.preview_url,
      uri: track.uri,
      votes: 0
    }));
    
    // Store these tracks in the database for future use
    await supabase
      .from('artists')
      .update({ stored_tracks: tracks })
      .eq('id', artistId);
    
    // Return sorted tracks
    return { 
      tracks: tracks
        .slice(0, limit)
        .sort((a: any, b: any) => a.name.localeCompare(b.name))
    };
      
  } catch (error) {
    console.error('Error getting artist top tracks:', error);
    // In case of error, return empty array
    return { tracks: [] };
  }
};

// Get all tracks for an artist
export const getArtistAllTracks = async (artistId: string): Promise<{ tracks: any[] }> => {
  try {
    // For now, this uses the same implementation as getArtistTopTracks
    // In a real app, you would implement pagination to get all tracks
    const result = await getArtistTopTracks(artistId, 50);
    return { 
      tracks: result.tracks.sort((a, b) => a.name.localeCompare(b.name)) 
    };
  } catch (error) {
    console.error('Error getting all artist tracks:', error);
    return { tracks: [] };
  }
};

// Add the following function to your existing spotify.ts file

export const getMyTopArtists = async () => {
  try {
    console.log('Fetching user top artists from Spotify API');
    
    // In a real implementation, we would call Spotify API with the user's access token
    // For now, we'll simulate with mock data
    const { data, error } = await supabase
      .from('artists')
      .select('*')
      .order('popularity', { ascending: false })
      .limit(9);
    
    if (error) throw error;
    
    console.log(`Fetched ${data.length} top artists for the user`);
    return data;
  } catch (error) {
    console.error('Error getting user top artists:', error);
    throw new Error('Failed to get your top artists from Spotify');
  }
};
