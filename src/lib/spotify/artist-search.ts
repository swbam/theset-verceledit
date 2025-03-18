
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { getAccessToken } from './auth';

const SPOTIFY_API_BASE = 'https://api.spotify.com/v1';

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
            image_url: spotifyArtist.images?.[0]?.url,
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
            image_url: spotifyArtist.images?.[0]?.url,
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
