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
    const topTracks = await fetchArtistTopTracks(artistId, token);
    
    // If we got top tracks, proceed to get albums and more tracks
    if (topTracks.length > 0) {
      // Now fetch all albums and their tracks
      const allTracks = await fetchArtistAlbums(artistId, token, topTracks);
      
      console.log(`Fetched ${allTracks.length} total tracks for artist ${artistId}`);
      
      // Store all tracks in the database
      await saveTracksToDb(artistId, allTracks);
      
      return { tracks: allTracks };
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
