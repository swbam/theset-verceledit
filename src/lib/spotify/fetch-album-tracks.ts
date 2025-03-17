
import { SpotifyTrack } from './types';

const SPOTIFY_API_BASE = 'https://api.spotify.com/v1';

/**
 * Fetches tracks for a batch of albums, handling rate limiting
 */
export const fetchAlbumTracks = async (
  albumBatch: any[], 
  token: string
): Promise<SpotifyTrack[]> => {
  try {
    const batchResults = await Promise.all(
      albumBatch.map(async (album: any) => {
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
    
    return batchResults.flat();
  } catch (error) {
    console.error('Error fetching album tracks:', error);
    return [];
  }
};
