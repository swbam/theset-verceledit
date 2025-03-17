
import { getAccessToken } from './auth';
import { getStoredTracksFromDb } from './utils';
import { getArtistAllTracks } from './all-tracks';
import { SpotifyTrack, SpotifyTracksResponse } from './types';
import { supabase } from '@/integrations/supabase/client';

// Get top tracks for an artist
export const getArtistTopTracks = async (artistId: string, limit = 10): Promise<SpotifyTracksResponse> => {
  try {
    // Check if we have stored tracks in the database
    const storedTracks = await getStoredTracksFromDb(artistId);
    
    if (storedTracks && storedTracks.length > 0) {
      console.log("Using stored tracks from database");
      // Return top tracks sorted by popularity
      return { 
        tracks: storedTracks
          .sort((a, b) => (b.popularity || 0) - (a.popularity || 0))
          .slice(0, limit)
      };
    }
    
    // If no stored tracks, fetch the complete catalog first
    const allTracksResult = await getArtistAllTracks(artistId);
    
    // If we got tracks from all-tracks, use those
    if (allTracksResult.tracks && allTracksResult.tracks.length > 0) {
      return { 
        tracks: allTracksResult.tracks
          .sort((a, b) => (b.popularity || 0) - (a.popularity || 0))
          .slice(0, limit)
      };
    }
    
    // If no tracks were returned from all-tracks, fetch from database again
    // (it's possible all-tracks added them)
    const { data: refreshedData, error: refreshError } = await supabase
      .from('artists')
      .select('stored_tracks')
      .eq('id', artistId)
      .maybeSingle();
      
    if (!refreshError && refreshedData && refreshedData.stored_tracks && 
        Array.isArray(refreshedData.stored_tracks)) {
      // Properly cast the Json to SpotifyTrack[]
      const tracks = refreshedData.stored_tracks as unknown as SpotifyTrack[];
      return { 
        tracks: tracks
          .sort((a, b) => (b.popularity || 0) - (a.popularity || 0))
          .slice(0, limit)
      };
    }
    
    // Fallback to mock data if something went wrong
    console.log("Falling back to mock data for top tracks");
    return generateMockTopTracks(artistId, limit);
  } catch (error) {
    console.error('Error getting artist top tracks:', error);
    // In case of error, return mock data
    return generateMockTopTracks(artistId, limit);
  }
};

// Helper function to generate mock top tracks
const generateMockTopTracks = (artistId: string, limit = 10): SpotifyTracksResponse => {
  console.log(`Generating ${limit} mock top tracks for artist ${artistId}`);
  
  const tracks = Array.from({ length: limit }, (_, i) => {
    const popularity = 90 - i * 5; // Descending popularity
    return {
      id: `mock-top-${artistId}-${i}`,
      name: `Top Hit ${i + 1}`,
      duration_ms: 180000 + Math.floor(Math.random() * 120000),
      popularity: popularity,
      preview_url: null,
      uri: `spotify:track:mock-top-${artistId}-${i}`,
      album: 'Greatest Hits',
      votes: Math.floor(popularity / 10)
    };
  });
  
  return { tracks };
};
