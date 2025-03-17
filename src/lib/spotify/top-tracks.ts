
import { getAccessToken } from './auth';
import { getStoredTracksFromDb, convertStoredTracks } from './utils';
import { getArtistAllTracks } from './all-tracks';
import { SpotifyTrack, SpotifyTracksResponse } from './types';
import { supabase } from '@/integrations/supabase/client';
import { generateMockTracks } from './mock-tracks';
import { fetchArtistTopTracks } from './fetch-artist-top-tracks';

// Get top tracks for an artist
export const getArtistTopTracks = async (artistId: string, limit = 10): Promise<SpotifyTracksResponse> => {
  console.log(`Getting top ${limit} tracks for artist ID: ${artistId}`);
  
  try {
    // Skip mock artist IDs
    if (artistId.includes('mock')) {
      console.log('Using mock data for mock artist ID in getArtistTopTracks');
      return generateMockTracks(artistId, limit);
    }
    
    // Check if we have stored tracks in the database
    const storedTracks = await getStoredTracksFromDb(artistId);
    
    if (storedTracks && storedTracks.length > 0) {
      console.log(`Using ${storedTracks.length} stored tracks from database for top tracks`);
      // Return top tracks sorted by popularity
      return { 
        tracks: storedTracks
          .sort((a, b) => (b.popularity || 0) - (a.popularity || 0))
          .slice(0, limit)
      };
    }
    
    // If no stored tracks, try to fetch directly from Spotify first
    console.log("No stored tracks found, fetching directly from Spotify API");
    const token = await getAccessToken();
    
    if (token) {
      const topTracks = await fetchArtistTopTracks(artistId, token);
      
      if (topTracks && topTracks.length > 0) {
        console.log(`Successfully fetched ${topTracks.length} top tracks directly`);
        return { tracks: topTracks.slice(0, limit) };
      }
    }
    
    // If direct fetch failed, try the all-tracks approach
    console.log("Direct top tracks fetch failed, trying all-tracks approach");
    const allTracksResult = await getArtistAllTracks(artistId);
    
    // If we got tracks from all-tracks, use those
    if (allTracksResult.tracks && allTracksResult.tracks.length > 0) {
      return { 
        tracks: allTracksResult.tracks
          .sort((a, b) => (b.popularity || 0) - (a.popularity || 0))
          .slice(0, limit)
      };
    }
    
    // If all else fails, return mock data
    console.log("All attempts to fetch tracks failed, using mock data");
    return generateMockTracks(artistId, limit);
  } catch (error) {
    console.error('Error getting artist top tracks:', error);
    // In case of error, return mock data
    return generateMockTracks(artistId, limit);
  }
};
