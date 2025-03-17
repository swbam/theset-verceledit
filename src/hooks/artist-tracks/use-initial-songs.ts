
import { useMemo } from 'react';
import { SpotifyTrack } from '@/lib/spotify/types';
import { generateMockSongs } from './utils';

// Prepare initial songs from top tracks or all tracks
export function useInitialSongs(
  topTracksData: { tracks?: SpotifyTrack[] } | undefined, 
  allTracksData: { tracks?: SpotifyTrack[] } | undefined
) {
  return useMemo(() => {
    console.log("Calculating initial songs. Top tracks:", 
      topTracksData?.tracks?.length, "All tracks:", allTracksData?.tracks?.length);
    
    // First try to use top tracks
    if (topTracksData?.tracks && Array.isArray(topTracksData.tracks) && topTracksData.tracks.length > 0) {
      console.log(`Using ${topTracksData.tracks.length} top tracks for initial setlist`);
      
      // Sort by popularity just to be sure
      const sortedTracks = [...topTracksData.tracks]
        .filter(track => track && track.id && track.name)
        .sort((a, b) => (b.popularity || 0) - (a.popularity || 0))
        .slice(0, 10);
      
      return sortedTracks.map((track: SpotifyTrack) => ({
        id: track.id,
        name: track.name,
        votes: Math.max(1, track.popularity ? Math.floor(track.popularity / 10) : 1), // Ensure non-zero initial votes
        userVoted: false
      }));
    }
    
    // If no top tracks, try all tracks
    if (allTracksData?.tracks && Array.isArray(allTracksData.tracks) && allTracksData.tracks.length > 0) {
      console.log(`Using sorted all tracks for initial setlist instead of top tracks`);
      
      return [...allTracksData.tracks]
        .filter(track => track && track.id && track.name)
        .sort((a, b) => (b.popularity || 0) - (a.popularity || 0))
        .slice(0, 10)
        .map((track: SpotifyTrack) => ({
          id: track.id,
          name: track.name,
          votes: Math.max(1, track.popularity ? Math.floor(track.popularity / 10) : 1), // Ensure non-zero initial votes
          userVoted: false
        }));
    }
    
    // Always ensure we have at least mock data if no real tracks are available
    console.log("No real tracks available for initial songs, using mock data");
    return generateMockSongs(10);
  }, [topTracksData, allTracksData]);
}
