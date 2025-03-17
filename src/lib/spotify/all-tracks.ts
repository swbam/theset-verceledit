
import { getAccessToken } from './auth';
import { saveTracksToDb } from './utils';
import { generateMockTracks } from './utils';
import { SpotifyTrack } from './types';

// Define the expected response type from the Spotify API
interface SpotifyAlbumsResponse {
  items: {
    id: string;
    name: string;
  }[];
}

interface SpotifyAlbumTracksResponse {
  items: SpotifyTrack[];
}

export async function getArtistAllTracks(artistId: string) {
  try {
    console.log(`Fetching all tracks for artist ID: ${artistId}`);
    
    // Get access token
    const token = await getAccessToken();
    
    // Fetch all of the artist's albums
    const albumsResponse = await fetch(
      `https://api.spotify.com/v1/artists/${artistId}/albums?include_groups=album,single&limit=50&market=US`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    
    if (!albumsResponse.ok) {
      console.error(`Failed to fetch albums for artist ${artistId}: ${albumsResponse.statusText}`);
      return { tracks: generateMockTracks(20) };
    }
    
    const albums = await albumsResponse.json() as SpotifyAlbumsResponse;
    
    if (!albums || !albums.items || albums.items.length === 0) {
      console.log("No albums found for artist, using mock data");
      return { tracks: generateMockTracks(20) };
    }
    
    console.log(`Found ${albums.items.length} albums for artist ${artistId}`);
    
    // For each album, fetch its tracks
    let allTracks: SpotifyTrack[] = [];
    const trackIds = new Set<string>();
    
    for (const album of albums.items) {
      try {
        const trackResponse = await fetch(
          `https://api.spotify.com/v1/albums/${album.id}/tracks?limit=50&market=US`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        
        if (!trackResponse.ok) {
          console.error(`Failed to fetch tracks for album ${album.id}: ${trackResponse.statusText}`);
          continue;
        }
        
        const albumTracks = await trackResponse.json() as SpotifyAlbumTracksResponse;
        
        // Add unique tracks to our collection
        if (albumTracks && albumTracks.items) {
          for (const track of albumTracks.items) {
            if (!trackIds.has(track.id)) {
              trackIds.add(track.id);
              allTracks.push(track);
            }
          }
        }
      } catch (error) {
        console.error(`Error fetching tracks for album ${album.id}:`, error);
      }
    }
    
    console.log(`Total unique tracks found: ${allTracks.length}`);
    
    // Save tracks to database for future use
    if (allTracks.length > 0) {
      saveTracksToDb(artistId, allTracks);
    }
    
    return { tracks: allTracks };
  } catch (error) {
    console.error("Error in getArtistAllTracks:", error);
    return { tracks: generateMockTracks(20) };
  }
}
