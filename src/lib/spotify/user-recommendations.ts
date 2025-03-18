import { SpotifyTrack } from './types';
import { generateMockTracks } from './utils';
import { getAccessToken } from './auth';
import { supabase } from '@/integrations/supabase/client';

// Get user's top artists from Spotify
export async function getMyTopArtists() {
  console.log("Fetching user's top artists from Spotify");
  
  try {
    // Get the user's session to access their Spotify token
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.provider_token) {
      console.warn("No Spotify provider token available");
      return getFallbackArtists();
    }
    
    // Use the provider token to fetch from Spotify API
    const response = await fetch('https://api.spotify.com/v1/me/top/artists?time_range=medium_term&limit=10', {
      headers: {
        'Authorization': `Bearer ${session.provider_token}`
      }
    });
    
    if (!response.ok) {
      console.error(`Error fetching from Spotify: ${response.status} ${response.statusText}`);
      
      // If token expired, try to refresh it (this would need to be implemented)
      if (response.status === 401) {
        console.warn("Spotify token expired, using fallback data");
      }
      
      return getFallbackArtists();
    }
    
    const data = await response.json();
    
    if (!data.items || !Array.isArray(data.items)) {
      console.error("Invalid response format from Spotify API");
      return getFallbackArtists();
    }
    
    // Map the Spotify response to our expected format
    return data.items.map(artist => ({
      id: artist.id,
      name: artist.name,
      images: artist.images,
      genres: artist.genres,
      followers: artist.followers
    }));
  } catch (error) {
    console.error("Error fetching top artists:", error);
    return getFallbackArtists();
  }
}

// Fallback artists when Spotify API fails
function getFallbackArtists() {
  return [
    {
      id: "4Z8W4fKeB5YxbusRsdQVPb",
      name: "Radiohead",
      images: [{ url: "https://i.scdn.co/image/ab67616d00001e02de3c04b5fc750b68899b20a9" }],
      genres: ["alternative rock", "art rock", "melancholia"],
      followers: { total: 11876887 }
    },
    {
      id: "0L8ExT028jH3ddEcZwqJJ5",
      name: "Red Hot Chili Peppers",
      images: [{ url: "https://i.scdn.co/image/ab67616d00001e0268283f7b969e4099a700a1d1" }],
      genres: ["alternative rock", "funk rock", "rock"],
      followers: { total: 16660268 }
    },
    {
      id: "6FQqZYVfTNQ1pCqfkwVFEa",
      name: "Foals",
      images: [{ url: "https://i.scdn.co/image/ab67616d00001e02ead87e33b924f915704ce1a8" }],
      genres: ["alternative dance", "indie rock", "modern rock"],
      followers: { total: 1582053 }
    }
  ];
}

// Get user's recommended tracks based on their top artists
export async function getUserRecommendations() {
  console.log("Fetching user's recommendations from Spotify");
  
  try {
    // Get the user's session to access their Spotify token
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.provider_token) {
      console.warn("No Spotify provider token available");
      return { tracks: generateMockTracks(10) };
    }
    
    // First get the user's top artists to use as seeds
    const topArtists = await getMyTopArtists();
    
    if (!topArtists || topArtists.length === 0) {
      return { tracks: generateMockTracks(10) };
    }
    
    // Take up to 5 artist IDs to use as seeds
    const artistSeeds = topArtists.slice(0, 5).map(artist => artist.id).join(',');
    
    // Use the provider token to fetch recommendations from Spotify API
    const response = await fetch(`https://api.spotify.com/v1/recommendations?seed_artists=${artistSeeds}&limit=10`, {
      headers: {
        'Authorization': `Bearer ${session.provider_token}`
      }
    });
    
    if (!response.ok) {
      console.error(`Error fetching recommendations: ${response.status} ${response.statusText}`);
      return { tracks: generateMockTracks(10) };
    }
    
    const data = await response.json();
    
    if (!data.tracks || !Array.isArray(data.tracks)) {
      console.error("Invalid response format from Spotify API");
      return { tracks: generateMockTracks(10) };
    }
    
    // Map the Spotify response to our expected format
    return { 
      tracks: data.tracks.map(track => ({
        id: track.id,
        name: track.name,
        artists: track.artists,
        album: track.album,
        uri: track.uri,
        duration_ms: track.duration_ms,
        popularity: track.popularity,
        preview_url: track.preview_url
      }))
    };
  } catch (error) {
    console.error("Error fetching recommendations:", error);
    return { tracks: generateMockTracks(10) };
  }
}
