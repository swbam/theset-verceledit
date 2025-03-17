
import { useMemo } from 'react';
import { SpotifyTrack } from '@/lib/spotify';
import { generateMockSongs } from './utils';

// Prepare initial songs from top tracks or all tracks
export function useInitialSongs(
  topTracksData: { tracks?: SpotifyTrack[] } | undefined, 
  allTracksData: { tracks?: SpotifyTrack[] } | undefined
) {
  return useMemo(() => {
    if (!topTracksData?.tracks || !Array.isArray(topTracksData.tracks) || topTracksData.tracks.length === 0) {
      if (allTracksData?.tracks && Array.isArray(allTracksData.tracks) && allTracksData.tracks.length > 0) {
        // Use a slice of all tracks sorted by popularity if top tracks are unavailable
        console.log("Using sorted all tracks instead of top tracks");
        return [...allTracksData.tracks]
          .sort((a, b) => (b.popularity || 0) - (a.popularity || 0))
          .slice(0, 10)
          .map((track: SpotifyTrack) => ({
            id: track.id,
            name: track.name,
            votes: track.popularity ? Math.floor(track.popularity / 20) : 0,
            userVoted: false
          }));
      }
      
      // Always ensure we have at least mock data if no real tracks are available
      console.log("Providing mock initial songs as fallback");
      return generateMockSongs(5);
    }
    
    console.log(`Converting ${topTracksData.tracks.length} top tracks to setlist items`);
    
    return topTracksData.tracks.map((track: SpotifyTrack) => ({
      id: track.id,
      name: track.name,
      votes: track.popularity ? Math.floor(track.popularity / 20) : 0,
      userVoted: false
    }));
  }, [topTracksData, allTracksData]);
}
