
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

// Add the missing function for fetching user's top artists
export const getMyTopArtists = async () => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.provider_token) {
      console.error("No Spotify provider token available");
      return [];
    }
    
    const response = await fetch('https://api.spotify.com/v1/me/top/artists?limit=20', {
      headers: {
        Authorization: `Bearer ${session.provider_token}`,
      },
    });
    
    if (!response.ok) {
      // If token expired or other issue
      console.error("Spotify API error:", response.status);
      return [];
    }
    
    const data = await response.json();
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
    return [];
  }
};
