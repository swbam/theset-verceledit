
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
    
    // Handle rate limiting - if we get a 429, return mock data
    if (topTracksResponse.status === 429) {
      console.warn("Rate limited by Spotify API (429). Using mock data instead.");
      return generateMockTracks(artistId, 40);
    }

    if (!topTracksResponse.ok) {
      console.error(`Failed to get top tracks: ${topTracksResponse.statusText}`);
      return generateMockTracks(artistId, 40);
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
    
    // Handle rate limiting for albums request
    if (albumsResponse.status === 429) {
      console.warn("Rate limited by Spotify API when fetching albums (429). Using top tracks only.");
      // Continue with top tracks we already have instead of failing completely
      if (allTracks.length > 0) {
        await saveTracksToDb(artistId, allTracks);
        return { tracks: allTracks };
      }
      return generateMockTracks(artistId, 40);
    }
    
    if (!albumsResponse.ok) {
      console.error(`Failed to get albums: ${albumsResponse.statusText}`);
      // Continue with top tracks we already have instead of failing completely
      if (allTracks.length > 0) {
        await saveTracksToDb(artistId, allTracks);
        return { tracks: allTracks };
      }
      return generateMockTracks(artistId, 40);
    }
    
    const albumsData = await albumsResponse.json();
    console.log(`Found ${albumsData.items.length} albums for artist ${artistId}`);
    
    // Use Promise.all to fetch all album tracks in parallel with smaller batches
    const batchSize = 5; // Process 5 albums at a time to avoid rate limiting
    const albumBatches = [];
    
    for (let i = 0; i < albumsData.items.length; i += batchSize) {
      albumBatches.push(albumsData.items.slice(i, i + batchSize));
    }
    
    // Process album batches sequentially to avoid rate limiting
    for (const batch of albumBatches) {
      const batchResults = await Promise.all(
        batch.map(async (album: any) => {
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
            
            // Handle rate limiting for album tracks
            if (tracksResponse.status === 429) {
              console.warn(`Rate limited when fetching tracks for album ${album.name}`);
              return [];
            }
            
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
        })
      );
      
      // Add all tracks from this batch to allTracks
      const existingTrackIds = new Set(allTracks.map(track => track.id));
      const batchTracks = batchResults.flat();
      
      for (const track of batchTracks) {
        if (!existingTrackIds.has(track.id)) {
          allTracks.push(track);
          existingTrackIds.add(track.id);
        }
      }
      
      // Add a small delay between batches to avoid rate limiting
      if (albumBatches.length > 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    console.log(`Fetched ${allTracks.length} total tracks for artist ${artistId}`);
    
    // Store all tracks in the database
    await saveTracksToDb(artistId, allTracks);
    
    return { tracks: allTracks };
  } catch (error) {
    console.error('Error getting all artist tracks:', error);
    // Return mock data on complete failure
    return generateMockTracks(artistId, 40);
  }
};

// Helper function to generate mock tracks
const generateMockTracks = (artistId: string, count = 40): SpotifyTracksResponse => {
  console.log(`Generating ${count} mock tracks for artist ${artistId}`);
  
  const tracks = Array.from({ length: count }, (_, i) => {
    const popularity = Math.max(10, 100 - i * 2); // Higher indices get lower popularity
    return {
      id: `mock-${artistId}-${i}`,
      name: `${i < 10 ? 'Top Hit' : 'Song'} ${i + 1}`,
      duration_ms: 180000 + Math.floor(Math.random() * 120000),
      popularity: popularity,
      preview_url: null,
      uri: `spotify:track:mock-${artistId}-${i}`,
      album: i < 15 ? 'Greatest Hits' : `Album ${Math.floor(i / 5) + 1}`,
      votes: 0
    };
  });
  
  return { tracks };
};
