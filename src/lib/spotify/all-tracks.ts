import { getAccessToken } from './auth';
import { saveTracksToDb, getStoredTracksFromDb } from './utils';
import { SpotifyTrack, SpotifyTracksResponse } from './types';
import { supabase } from '@/integrations/supabase/client';

const SPOTIFY_API_BASE = 'https://api.spotify.com/v1';

// Get all tracks for an artist
export const getArtistAllTracks = async (artistId: string): Promise<SpotifyTracksResponse> => {
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
      // Properly cast the Json to SpotifyTrack[]
      return { tracks: artistData.stored_tracks as unknown as SpotifyTrack[] };
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
    
    // Get all albums (increase limit to 50 to get more)
    const albumsResponse = await fetch(
      `${SPOTIFY_API_BASE}/artists/${artistId}/albums?include_groups=album,single,compilation&limit=50&market=US`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    
    if (!albumsResponse.ok) {
      console.error(`Failed to get albums: ${albumsResponse.statusText}`);
      // Continue with top tracks we already have instead of failing completely
      console.log(`Continuing with ${allTracks.length} top tracks only`);
      await saveTracksToDb(artistId, allTracks);
      return { tracks: allTracks };
    }
    
    const albumsData = await albumsResponse.json();
    console.log(`Found ${albumsData.items.length} albums for artist ${artistId}`);
    
    // Use Promise.all to fetch all album tracks in parallel
    const albumTrackPromises = albumsData.items.map(async (album: any) => {
      try {
        console.log(`Processing album: ${album.name}`);
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
          return [];
        }
        
        const tracksData = await tracksResponse.json();
        console.log(`Found ${tracksData.items.length} tracks in album ${album.name}`);
        
        // Process all tracks from this album - no need to fetch each track individually
        return tracksData.items.map((track: any) => ({
          id: track.id,
          name: track.name,
          duration_ms: track.duration_ms || 0,
          popularity: 50, // Default popularity if not available
          preview_url: track.preview_url,
          uri: track.uri,
          album: album.name,
          votes: 0
        }));
      } catch (error) {
        console.error(`Error processing album ${album.name}:`, error);
        return [];
      }
    });
    
    // Wait for all album track requests to complete
    const albumTracksArrays = await Promise.all(albumTrackPromises);
    
    // Flatten the array of arrays and add all album tracks
    const allAlbumTracks = albumTracksArrays.flat();
    
    // Add album tracks to the top tracks, excluding duplicates by ID
    const existingTrackIds = new Set(allTracks.map(track => track.id));
    
    for (const track of allAlbumTracks) {
      if (!existingTrackIds.has(track.id)) {
        allTracks.push(track);
        existingTrackIds.add(track.id);
      }
    }
    
    console.log(`Fetched ${allTracks.length} total tracks for artist ${artistId}`);
    
    // Store all tracks in the database
    await saveTracksToDb(artistId, allTracks);
    
    return { tracks: allTracks };
  } catch (error) {
    console.error('Error getting all artist tracks:', error);
    // Return empty array on complete failure
    return { tracks: [] };
  }
};
