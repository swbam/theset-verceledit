import { getArtistTopTracksFromDb, checkArtistTracksNeedUpdate, saveTracksToDb } from './utils';
import { fetchArtistTopTracksFromSpotify } from './fetch-artist-top-tracks';
import { SpotifyTrack } from './types';

/**
 * Fetches an artist's top tracks from Spotify API
 * @param artistId The Spotify ID of the artist
 * @param limit Maximum number of tracks to return (default: 10)
 * @returns An object containing the artist's top tracks
 */
export async function getArtistTopTracks(
  artistId: string,
  limit: number = 10
): Promise<{ tracks: SpotifyTrack[] }> {
  if (!artistId) {
    console.error('No artist ID provided to getArtistTopTracks');
    return { tracks: [] };
  }
  
  try {
    console.log(`Getting top tracks for artist ${artistId}`);
    
    // Check if we have this artist's top tracks cached in the database
    const cachedTracks = await getArtistTopTracksFromDb(artistId, limit);
    const needsUpdate = await checkArtistTracksNeedUpdate(artistId);
    
    // If we have tracks cached and they don't need an update, use them
    if (cachedTracks.length > 0 && !needsUpdate) {
      console.log(`Using ${cachedTracks.length} cached top tracks for ${artistId}`);
      return { tracks: cachedTracks };
    }
    
    // Otherwise, fetch from Spotify
    console.log(`Fetching new top tracks from Spotify for ${artistId}`);
    try {
      const spotifyTracks = await fetchArtistTopTracksFromSpotify(artistId);
      
      // If we got tracks, save them to the database
      if (spotifyTracks && spotifyTracks.length > 0) {
        await saveTracksToDb(artistId, spotifyTracks);
        return { tracks: spotifyTracks.slice(0, limit) };
      }
      
      // If Spotify returned no tracks but we have cached tracks, use those
      if (cachedTracks.length > 0) {
        console.log("No tracks found in Spotify, using database tracks");
        return { tracks: cachedTracks };
      }
      
      // No tracks found anywhere
      console.log("No tracks found in database or Spotify");
      return { tracks: [] };
    } catch (spotifyError) {
      console.error("Error fetching from Spotify:", spotifyError);
      
      // If Spotify fetch fails but we have cached tracks, use those
      if (cachedTracks.length > 0) {
        console.log("Falling back to database tracks");
        return { tracks: cachedTracks };
      }
      
      // No tracks available
      return { tracks: [] };
    }
  } catch (error) {
    console.error("Error in getArtistTopTracks:", error);
    return { tracks: [] };
  }
}
