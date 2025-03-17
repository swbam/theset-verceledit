import { getAccessToken } from './auth';
import { saveTracksToDb, getStoredTracksFromDb } from './utils';
import { SpotifyTrack, SpotifyTracksResponse } from './types';
import { supabase } from '@/integrations/supabase/client';
import { generateMockTracks } from './mock-tracks';
import { fetchArtistTopTracks } from './fetch-artist-top-tracks';
import { fetchArtistAlbums } from './fetch-artist-albums';

/**
 * Main function to get all tracks for an artist
 * First tries database cache, then Spotify API if needed
 */
export const getArtistAllTracks = async (artistId: string): Promise<SpotifyTracksResponse> => {
  console.log(`Getting all tracks for artist ID: ${artistId}`);
  
  try {
    // Skip mock artist IDs
    if (artistId.includes('mock')) {
      console.log('Using mock data for mock artist ID');
      return generateMockTracks(artistId, 40);
    }
    
    // Check if we have stored tracks and they're less than 7 days old
    const storedTracks = await getStoredTracksFromDb(artistId);
    
    // If we have stored tracks with sufficient quantity, use them
    if (storedTracks && storedTracks.length > 10) {
      console.log(`Using ${storedTracks.length} stored tracks from database`);
      return { tracks: storedTracks };
    }
    
    // Otherwise fetch from Spotify API
    console.log(`Fetching complete track catalog for artist ID: ${artistId}`);
    const token = await getAccessToken();
    
    if (!token) {
      console.error('Failed to get Spotify access token');
      return generateMockTracks(artistId, 40);
    }
    
    // First get the top tracks as a starting point
    const topTracks = await fetchArtistTopTracks(artistId, token);
    
    // If we got top tracks, proceed to get albums and more tracks
    if (topTracks && topTracks.length > 0) {
      // Now fetch all albums and their tracks
      const allTracks = await fetchArtistAlbums(artistId, token, topTracks);
      
      console.log(`Fetched ${allTracks.length} total tracks for artist ${artistId}`);
      
      // Store all tracks in the database
      await saveTracksToDb(artistId, allTracks);
      
      return { tracks: allTracks };
    }
    
    // If no tracks were fetched from top tracks, check if we have any stored tracks
    if (storedTracks && storedTracks.length > 0) {
      console.log(`Using ${storedTracks.length} stored tracks from database as fallback`);
      return { tracks: storedTracks };
    }
    
    // If no tracks were fetched, return mock data
    console.log("No tracks fetched from Spotify API, using mock data");
    return generateMockTracks(artistId, 40);
  } catch (error) {
    console.error('Error getting all artist tracks:', error);
    // Return mock data on complete failure
    return generateMockTracks(artistId, 40);
  }
};
