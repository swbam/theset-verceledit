
// Re-export all Spotify API functions and types
export * from './auth';
export * from './artist-search';
export * from './artist-tracks';
export * from './all-tracks';
export * from './top-tracks';
export * from './user-recommendations';
export * from './types';
export * from './utils';

import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Add the missing function for fetching user's top artists
export const getMyTopArtists = async () => {
  try {
    console.log("Fetching top artists...");
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.provider_token) {
      console.error("No Spotify provider token available");
      toast.error("Spotify connection required. Please reconnect your account.");
      return [];
    }
    
    console.log("Using provider token to fetch artists");
    const response = await fetch('https://api.spotify.com/v1/me/top/artists?limit=20', {
      headers: {
        Authorization: `Bearer ${session.provider_token}`,
      },
    });
    
    if (!response.ok) {
      // Handle common errors
      if (response.status === 401) {
        toast.error("Spotify access expired. Please reconnect your account.");
        console.error("Spotify token expired");
      } else {
        toast.error(`Spotify API error: ${response.status}`);
        console.error("Spotify API error:", response.status, await response.text());
      }
      return [];
    }
    
    const data = await response.json();
    console.log(`Found ${data.items?.length || 0} top artists`);
    
    return data.items.map((artist: any) => ({
      id: artist.id,
      name: artist.name,
      image: artist.images?.[0]?.url || '/placeholder.svg',
      genres: artist.genres || [],
      popularity: artist.popularity,
      spotifyUrl: artist.external_urls?.spotify,
      followers: artist.followers?.total
    }));
  } catch (error) {
    console.error("Error fetching top artists:", error);
    toast.error("Failed to load artists from Spotify");
    return [];
  }
};
