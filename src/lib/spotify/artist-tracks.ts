
import { supabase } from '@/integrations/supabase/client';
import { getAccessToken } from './auth';

const SPOTIFY_API_BASE = 'https://api.spotify.com/v1';

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

// Get my top artists
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
