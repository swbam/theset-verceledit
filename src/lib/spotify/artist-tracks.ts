import { supabase } from '@/integrations/supabase/client';
import { getAccessToken } from './auth';
import { Json } from '@/integrations/supabase/types';

const SPOTIFY_API_BASE = 'https://api.spotify.com/v1';

// Track interface for type safety
interface SpotifyTrack {
  id: string;
  name: string;
  duration_ms?: number;
  popularity?: number;
  preview_url?: string;
  uri?: string;
  album?: string;
  votes?: number;
}

// Get top tracks for an artist
export const getArtistTopTracks = async (artistId: string, limit = 10): Promise<{ tracks: SpotifyTrack[] }> => {
  try {
    // Check if we have stored tracks in the database
    const { data: artistData, error } = await supabase
      .from('artists')
      .select('stored_tracks')
      .eq('id', artistId)
      .maybeSingle();
    
    if (!error && artistData && artistData.stored_tracks && 
        Array.isArray(artistData.stored_tracks) && 
        artistData.stored_tracks.length > 0) {
      console.log("Using stored tracks from database");
      // Return top tracks sorted by popularity
      const tracks = artistData.stored_tracks as SpotifyTrack[];
      return { 
        tracks: tracks
          .sort((a, b) => (b.popularity || 0) - (a.popularity || 0))
          .slice(0, limit)
      };
    }
    
    // If no stored tracks, fetch the complete catalog first
    await getArtistAllTracks(artistId);
    
    // Then get the artist data again
    const { data: refreshedData, error: refreshError } = await supabase
      .from('artists')
      .select('stored_tracks')
      .eq('id', artistId)
      .maybeSingle();
      
    if (!refreshError && refreshedData && refreshedData.stored_tracks && 
        Array.isArray(refreshedData.stored_tracks)) {
      // Return top tracks sorted by popularity
      const tracks = refreshedData.stored_tracks as SpotifyTrack[];
      return { 
        tracks: tracks
          .sort((a, b) => (b.popularity || 0) - (a.popularity || 0))
          .slice(0, limit)
      };
    }
    
    // Fallback if something went wrong
    return { tracks: [] };
      
  } catch (error) {
    console.error('Error getting artist top tracks:', error);
    // In case of error, return empty array
    return { tracks: [] };
  }
};

// Get all tracks for an artist
export const getArtistAllTracks = async (artistId: string): Promise<{ tracks: SpotifyTrack[] }> => {
  try {
    // Check if we have stored tracks and they're less than 7 days old
    const { data: artistData, error } = await supabase
      .from('artists')
      .select('stored_tracks, updated_at')
      .eq('id', artistId)
      .maybeSingle();
    
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    // If we have stored tracks and they're recent, use them
    if (!error && artistData && artistData.stored_tracks && 
        Array.isArray(artistData.stored_tracks) && 
        artistData.stored_tracks.length > 0 &&
        new Date(artistData.updated_at) > sevenDaysAgo) {
      console.log(`Using ${artistData.stored_tracks.length} stored tracks from database`);
      return { tracks: artistData.stored_tracks as SpotifyTrack[] };
    }
    
    // Otherwise fetch from Spotify API
    console.log(`Fetching complete track catalog for artist ID: ${artistId}`);
    const token = await getAccessToken();
    
    // First get the top tracks as a starting point
    const topTracksResponse = await fetch(
      `${SPOTIFY_API_BASE}/artists/${artistId}/top-tracks?market=US`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    
    if (!topTracksResponse.ok) {
      throw new Error(`Failed to get top tracks: ${topTracksResponse.statusText}`);
    }
    
    const topTracksData = await topTracksResponse.json();
    let allTracks: SpotifyTrack[] = topTracksData.tracks.map((track: any) => ({
      id: track.id,
      name: track.name,
      duration_ms: track.duration_ms,
      popularity: track.popularity,
      preview_url: track.preview_url,
      uri: track.uri,
      album: track.album?.name || 'Unknown Album',
      votes: 0
    }));
    
    // Now get albums
    const albumsResponse = await fetch(
      `${SPOTIFY_API_BASE}/artists/${artistId}/albums?include_groups=album,single&limit=50&market=US`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    
    if (!albumsResponse.ok) {
      throw new Error(`Failed to get albums: ${albumsResponse.statusText}`);
    }
    
    const albumsData = await albumsResponse.json();
    
    // For each album, get all tracks
    for (const album of albumsData.items) {
      const tracksResponse = await fetch(
        `${SPOTIFY_API_BASE}/albums/${album.id}/tracks?limit=50&market=US`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      
      if (!tracksResponse.ok) {
        console.error(`Failed to get tracks for album ${album.id}: ${tracksResponse.statusText}`);
        continue;
      }
      
      const tracksData = await tracksResponse.json();
      
      // Get full track details for each track (for popularity score)
      for (const track of tracksData.items) {
        // Skip if we already have this track from top tracks
        if (allTracks.some((t) => t.id === track.id)) {
          continue;
        }
        
        // Get full track details
        try {
          const trackResponse = await fetch(
            `${SPOTIFY_API_BASE}/tracks/${track.id}?market=US`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );
          
          if (!trackResponse.ok) {
            continue;
          }
          
          const trackData = await trackResponse.json();
          
          allTracks.push({
            id: trackData.id,
            name: trackData.name,
            duration_ms: trackData.duration_ms,
            popularity: trackData.popularity || 0,
            preview_url: trackData.preview_url,
            uri: trackData.uri,
            album: album.name,
            votes: 0
          });
        } catch (e) {
          console.error(`Error fetching detail for track ${track.id}:`, e);
        }
      }
    }
    
    console.log(`Fetched ${allTracks.length} total tracks for artist ${artistId}`);
    
    // Remove duplicates (based on ID)
    const uniqueTracks = Array.from(
      new Map(allTracks.map((track) => [track.id, track])).values()
    );
    
    // Store all tracks in the database
    // Convert tracks to a JSON-compatible format
    const tracksForStorage: Json = uniqueTracks as unknown as Json;
    
    await supabase
      .from('artists')
      .update({ 
        stored_tracks: tracksForStorage,
        updated_at: new Date().toISOString()
      })
      .eq('id', artistId);
    
    console.log(`Stored ${uniqueTracks.length} unique tracks in database for artist ${artistId}`);
    
    return { tracks: uniqueTracks };
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
