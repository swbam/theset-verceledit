
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
      throw new Error(`Failed to get albums: ${albumsResponse.statusText}`);
    }
    
    const albumsData = await albumsResponse.json();
    console.log(`Found ${albumsData.items.length} albums for artist ${artistId}`);
    
    // For each album, get all tracks
    for (const album of albumsData.items) {
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
        continue;
      }
      
      const tracksData = await tracksResponse.json();
      console.log(`Found ${tracksData.items.length} tracks in album ${album.name}`);
      
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
    await saveTracksToDb(artistId, uniqueTracks);
    
    return { tracks: uniqueTracks };
  } catch (error) {
    console.error('Error getting all artist tracks:', error);
    return { tracks: [] };
  }
};
