import { supabase } from "@/lib/supabase";
import { getAccessToken } from "./auth";

/**
 * Fetch the current user's top artists from Spotify
 */
export async function getSpotifyUserTopArtists(limit = 20) {
  try {
    // First try to get the user session with their Spotify token
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session || !session.provider_token) {
      console.error("No valid Spotify session found");
      return [];
    }
    
    // Use the provider_token (Spotify OAuth token) to make API calls
    const response = await fetch('https://api.spotify.com/v1/me/top/artists?limit=50&time_range=medium_term', {
      headers: {
        'Authorization': `Bearer ${session.provider_token}`
      }
    });
    
    if (!response.ok) {
      // If token expired, we might need to refresh the session
      if (response.status === 401) {
        // For now, just log the error - in a production app, we'd implement token refresh
        console.error("Spotify token expired");
      }
      
      throw new Error(`Spotify API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.items || !Array.isArray(data.items)) {
      return [];
    }
    
    // Format the artists into a consistent structure
    return data.items.map(artist => ({
      id: artist.id,
      name: artist.name,
      image: artist.images?.[0]?.url,
      image_url: artist.images?.[0]?.url,
      genres: artist.genres || [],
      popularity: artist.popularity || 0,
      spotify_url: artist.external_urls?.spotify,
      followers: artist.followers?.total || 0,
      // Include these fields for consistency with the database schema
      upcoming_shows: 0,
      upcomingShows: 0
    })).slice(0, limit);
  } catch (error) {
    console.error("Error fetching Spotify top artists:", error);
    return [];
  }
}

/**
 * Fetch the current user's followed artists from Spotify
 */
export async function getSpotifyUserFollowedArtists(limit = 20) {
  try {
    // First try to get the user session with their Spotify token
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session || !session.provider_token) {
      console.error("No valid Spotify session found");
      return [];
    }
    
    // Use the provider_token (Spotify OAuth token) to make API calls
    const response = await fetch('https://api.spotify.com/v1/me/following?type=artist&limit=50', {
      headers: {
        'Authorization': `Bearer ${session.provider_token}`
      }
    });
    
    if (!response.ok) {
      throw new Error(`Spotify API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.artists?.items || !Array.isArray(data.artists.items)) {
      return [];
    }
    
    // Format the artists into a consistent structure
    return data.artists.items.map(artist => ({
      id: artist.id,
      name: artist.name,
      image: artist.images?.[0]?.url,
      image_url: artist.images?.[0]?.url,
      genres: artist.genres || [],
      popularity: artist.popularity || 0,
      spotify_url: artist.external_urls?.spotify,
      followers: artist.followers?.total || 0,
      // Include these fields for consistency with the database schema
      upcoming_shows: 0,
      upcomingShows: 0
    })).slice(0, limit);
  } catch (error) {
    console.error("Error fetching Spotify followed artists:", error);
    return [];
  }
}

/**
 * Get the current user's Spotify profile
 */
export async function getSpotifyUserProfile() {
  try {
    // Get the user session with their Spotify token
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session || !session.provider_token) {
      console.error("No valid Spotify session found");
      return null;
    }
    
    const response = await fetch('https://api.spotify.com/v1/me', {
      headers: {
        'Authorization': `Bearer ${session.provider_token}`
      }
    });
    
    if (!response.ok) {
      throw new Error(`Spotify API error: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error("Error fetching Spotify user profile:", error);
    return null;
  }
}

/**
 * Check if a user follows a specific artist
 */
export async function checkUserFollowsArtist(artistId: string) {
  try {
    // Get the user session with their Spotify token
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session || !session.provider_token) {
      return false;
    }
    
    const response = await fetch(`https://api.spotify.com/v1/me/following/contains?type=artist&ids=${artistId}`, {
      headers: {
        'Authorization': `Bearer ${session.provider_token}`
      }
    });
    
    if (!response.ok) {
      return false;
    }
    
    const data = await response.json();
    return Array.isArray(data) && data[0] === true;
  } catch (error) {
    console.error("Error checking if user follows artist:", error);
    return false;
  }
} 