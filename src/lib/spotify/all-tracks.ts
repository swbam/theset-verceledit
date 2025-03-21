import { getAccessToken } from './auth';
import { saveTracksToDb, getStoredTracksFromDb } from './utils';
import { SpotifyTrack, SpotifyTracksResponse } from './types';
import { supabase } from '@/integrations/supabase/client';
import { updateArtistStoredTracks } from '@/lib/api/database';

const SPOTIFY_API_BASE = 'https://api.spotify.com/v1';

// Get all tracks for an artist
export const getArtistAllTracks = async (artistId: string): Promise<SpotifyTracksResponse> => {
  try {
    console.log(`Getting all tracks for artist ID: ${artistId}`);
    
    // Check if we have stored tracks and they're less than 7 days old
    const { data: artistData, error } = await supabase
      .from('artists')
      .select('stored_tracks, updated_at, tracks_last_updated, id')
      .eq('spotify_id', artistId)
      .maybeSingle();
    
    // If we couldn't check Supabase, still try to get data from Spotify
    if (error) {
      console.warn("Database check error:", error.message);
    }
    
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    // If we have stored tracks and they're recent, use them
    if (!error && artistData && artistData.stored_tracks && 
        Array.isArray(artistData.stored_tracks) && 
        artistData.stored_tracks.length > 0 &&
        (artistData.tracks_last_updated && new Date(artistData.tracks_last_updated) > sevenDaysAgo)) {
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
      console.error(`Failed to get top tracks: ${topTracksResponse.statusText}`);
      // Return empty result if we can't get top tracks
      return { tracks: [] };
    }
    
    const topTracksData = await topTracksResponse.json();
    if (!topTracksData.tracks || !Array.isArray(topTracksData.tracks)) {
      console.error("Invalid top tracks data received from Spotify");
      return { tracks: [] };
    }
    
    let allTracks: SpotifyTrack[] = topTracksData.tracks.map((track: any) => ({
      id: track.id,
      name: track.name,
      votes: 0
    }));
    
    // Ensure we have at least some tracks before continuing
    if (allTracks.length === 0) {
      console.warn("No top tracks found for artist");
      return { tracks: [] };
    }
    
    try {
      // Get all albums (increase limit to 50 to get more)
      const albumsResponse = await fetch(
        `${SPOTIFY_API_BASE}/artists/${artistId}/albums?include_groups=album,single&limit=20&market=US`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      
      if (!albumsResponse.ok) {
        console.warn(`Failed to get albums: ${albumsResponse.statusText}`);
        // Return just the top tracks if we can't get albums
        return { tracks: allTracks };
      }
      
      const albumsData = await albumsResponse.json();
      if (!albumsData.items || !Array.isArray(albumsData.items)) {
        console.warn("Invalid albums data received from Spotify");
        return { tracks: allTracks };
      }
      
      console.log(`Found ${albumsData.items.length} albums for artist ${artistId}`);
      
      // Get a subset of albums (most recent ones)
      const recentAlbums = albumsData.items.slice(0, 5);
      
      // For each album, get all tracks
      for (const album of recentAlbums) {
        console.log(`Processing album: ${album.name}`);
        
        try {
          const tracksResponse = await fetch(
            `${SPOTIFY_API_BASE}/albums/${album.id}/tracks?limit=50&market=US`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );
          
          if (!tracksResponse.ok) {
            console.warn(`Failed to get tracks for album ${album.id}: ${tracksResponse.statusText}`);
            continue;
          }
          
          const tracksData = await tracksResponse.json();
          if (!tracksData.items || !Array.isArray(tracksData.items)) {
            console.warn(`Invalid tracks data for album ${album.id}`);
            continue;
          }
          
          console.log(`Found ${tracksData.items.length} tracks in album ${album.name}`);
          
          // Add all tracks from this album, simplified structure with just ID and name
          for (const track of tracksData.items) {
            // Skip if we already have this track from top tracks
            if (allTracks.some((t) => t.id === track.id)) {
              continue;
            }
            
            allTracks.push({
              id: track.id,
              name: track.name,
              votes: 0
            });
          }
        } catch (err) {
          console.warn(`Error processing album ${album.id}:`, err);
          continue;
        }
      }
    } catch (albumError) {
      console.warn("Error fetching albums:", albumError);
      // Return just the top tracks if album fetching fails
    }
    
    console.log(`Fetched ${allTracks.length} total tracks for artist ${artistId}`);
    
    // Remove duplicates (based on ID)
    const uniqueTracks = Array.from(
      new Map(allTracks.map((track) => [track.id, track])).values()
    );
    
    // Try to store tracks in the database, but don't fail if it doesn't work
    try {
      if (artistData && artistData.id) {
        await updateArtistStoredTracks(artistData.id, uniqueTracks);
        console.log(`Updated stored tracks for artist ${artistId}`);
      }
    } catch (storageError) {
      console.warn("Error storing tracks:", storageError);
      // Continue without failing
    }
    
    return { tracks: uniqueTracks };
  } catch (error) {
    console.error('Error getting all artist tracks:', error);
    return { tracks: [] };
  }
};
