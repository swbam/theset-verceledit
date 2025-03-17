
import { fetchArtistAlbums } from './fetch-artist-albums';
import { saveTracksToDb } from './utils';
import { generateMockTracks } from './utils';
import { fetchAlbumTracks } from './fetch-album-tracks';
import { SpotifyTrack, SpotifyApi } from './types';

export async function getArtistAllTracks(artistId: string) {
  try {
    console.log(`Fetching all tracks for artist ID: ${artistId}`);
    
    // Fetch all of the artist's albums
    const albums = await fetchArtistAlbums(artistId);
    if (!albums || !albums.items || albums.items.length === 0) {
      console.log("No albums found for artist, using mock data");
      return { tracks: generateMockTracks(20) };
    }
    
    console.log(`Found ${albums.items.length} albums for artist ${artistId}`);
    
    // For each album, fetch its tracks
    let allTracks: SpotifyApi.TrackObjectSimplified[] = [];
    const trackIds = new Set<string>();
    
    for (const album of albums.items) {
      try {
        const albumTracks = await fetchAlbumTracks(album.id);
        
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
