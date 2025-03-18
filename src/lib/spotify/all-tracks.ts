import { getAccessToken } from './auth';
import { saveTracksToDb, getStoredTracksFromDb, checkArtistTracksNeedUpdate } from './utils';
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

export async function getArtistAllTracks(artistId: string): Promise<{ tracks: SpotifyTrack[] }> {
  try {
    console.log(`Fetching all tracks for artist ID: ${artistId}`);
    
    // First check if we already have stored tracks for this artist
    const storedTracks = await getStoredTracksFromDb(artistId);
    const needsUpdate = await checkArtistTracksNeedUpdate(artistId);
    
    if (storedTracks && storedTracks.length > 10 && !needsUpdate) {
      console.log(`Using ${storedTracks.length} cached tracks from database for all tracks`);
      return { tracks: storedTracks };
    }
    
    // If we need to update or don't have enough tracks, fetch from Spotify
    console.log(`Fetching fresh catalog from Spotify for artist ${artistId}`);
    
    // Get access token
    const token = await getAccessToken();
    
    // Fetch all of the artist's albums
    const albumsResponse = await fetch(
      `https://api.spotify.com/v1/artists/${artistId}/albums?include_groups=album,single&limit=50&market=US`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        next: { revalidate: 86400 }, // Cache for 24 hours
      }
    );
    
    if (!albumsResponse.ok) {
      console.error(`Failed to fetch albums for artist ${artistId}: ${albumsResponse.statusText}`);
      
      // If we have some stored tracks, better return those than empty array
      if (storedTracks && storedTracks.length > 0) {
        return { tracks: storedTracks };
      }
      return { tracks: [] };
    }
    
    const albums = await albumsResponse.json() as SpotifyAlbumsResponse;
    
    if (!albums || !albums.items || albums.items.length === 0) {
      console.log("No albums found for artist");
      if (storedTracks && storedTracks.length > 0) {
        return { tracks: storedTracks };
      }
      return { tracks: [] };
    }
    
    console.log(`Found ${albums.items.length} albums for artist ${artistId}`);
    
    // For each album, fetch its tracks
    const allTracks: SpotifyTrack[] = [];
    const trackIds = new Set<string>();
    
    for (const album of albums.items.slice(0, 10)) { // Limit to 10 albums to avoid rate limiting
      try {
        const trackResponse = await fetch(
          `https://api.spotify.com/v1/albums/${album.id}/tracks?limit=50&market=US`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
            next: { revalidate: 86400 }, // Cache for 24 hours
          }
        );
        
        if (!trackResponse.ok) {
          console.error(`Failed to fetch tracks for album ${album.id}: ${trackResponse.statusText}`);
          continue;
        }
        
        const albumTracks = await trackResponse.json() as SpotifyAlbumTracksResponse;
        
        // Additional request to get track details including popularity
        if (albumTracks && albumTracks.items) {
          // Get track IDs for this album
          const albumTrackIds = albumTracks.items.map(track => track.id).filter(id => !trackIds.has(id));
          
          // Split into chunks of 50 for the API limit
          for (let i = 0; i < albumTrackIds.length; i += 50) {
            const idChunk = albumTrackIds.slice(i, i + 50);
            if (idChunk.length === 0) continue;
            
            // Get detailed track info including popularity
            const detailsResponse = await fetch(
              `https://api.spotify.com/v1/tracks?ids=${idChunk.join(',')}&market=US`,
              {
                headers: {
                  Authorization: `Bearer ${token}`,
                },
                next: { revalidate: 86400 }, // Cache for 24 hours
              }
            );
            
            if (detailsResponse.ok) {
              const trackDetails = await detailsResponse.json();
              
              if (trackDetails && trackDetails.tracks) {
                // Add unique tracks to our collection
                for (const track of trackDetails.tracks) {
                  if (!trackIds.has(track.id)) {
                    trackIds.add(track.id);
                    allTracks.push({
                      id: track.id,
                      name: track.name,
                      album: {
                        name: track.album?.name,
                        images: track.album?.images || []
                      },
                      artists: track.artists,
                      uri: track.uri,
                      duration_ms: track.duration_ms,
                      popularity: track.popularity,
                      preview_url: track.preview_url
                    });
                  }
                }
              }
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
      await saveTracksToDb(artistId, allTracks);
      return { tracks: allTracks };
    }
    
    // If we couldn't get any tracks from Spotify but have stored tracks, use those
    if (storedTracks && storedTracks.length > 0) {
      console.log(`No tracks found from Spotify, using ${storedTracks.length} stored tracks`);
      return { tracks: storedTracks };
    }
    
    // No tracks found anywhere
    return { tracks: [] };
  } catch (error) {
    console.error("Error in getArtistAllTracks:", error);
    
    // If we have stored tracks, use those as fallback
    const storedTracks = await getStoredTracksFromDb(artistId);
    if (storedTracks && storedTracks.length > 0) {
      console.log(`Error occurred, falling back to ${storedTracks.length} stored tracks`);
      return { tracks: storedTracks };
    }
    
    return { tracks: [] };
  }
}
