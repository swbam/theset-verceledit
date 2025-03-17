
import { SpotifyTrack } from './types';
import { fetchAlbumTracks } from './fetch-album-tracks';

const SPOTIFY_API_BASE = 'https://api.spotify.com/v1';

/**
 * Fetches all albums for an artist and their tracks
 */
export const fetchArtistAlbums = async (
  artistId: string, 
  token: string,
  allTracks: SpotifyTrack[]
): Promise<SpotifyTrack[]> => {
  try {
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
      return allTracks;
    }
    
    if (!albumsResponse.ok) {
      console.error(`Failed to get albums: ${albumsResponse.statusText}`);
      return allTracks;
    }
    
    const albumsData = await albumsResponse.json();
    console.log(`Found ${albumsData.items.length} albums for artist ${artistId}`);
    
    // Use Promise.all to fetch all album tracks in parallel with smaller batches
    const batchSize = 5; // Process 5 albums at a time to avoid rate limiting
    const albumBatches = [];
    
    for (let i = 0; i < albumsData.items.length; i += batchSize) {
      albumBatches.push(albumsData.items.slice(i, i + batchSize));
    }
    
    const existingTrackIds = new Set(allTracks.map(track => track.id));
    let updatedTracks = [...allTracks];
    
    // Process album batches sequentially to avoid rate limiting
    for (const batch of albumBatches) {
      const batchTracks = await fetchAlbumTracks(batch, token);
      
      // Add new tracks from this batch to allTracks
      for (const track of batchTracks) {
        if (!existingTrackIds.has(track.id)) {
          updatedTracks.push(track);
          existingTrackIds.add(track.id);
        }
      }
      
      // Add a small delay between batches to avoid rate limiting
      if (albumBatches.length > 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    return updatedTracks;
  } catch (error) {
    console.error('Error fetching artist albums:', error);
    return allTracks;
  }
};
