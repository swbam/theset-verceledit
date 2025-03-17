
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
        .slice(0, 5); // Only use the top 5 tracks
      
      // Initialize with 0 votes for each song (system will handle votes separately)
      return sortedTracks.map((track: SpotifyTrack) => ({
        id: track.id,
        name: track.name,
        votes: 0, // Start with 0 votes for clean initial state
        userVoted: false
      }));
    }
    
    // If no top tracks, try all tracks
    if (allTracksData?.tracks && Array.isArray(allTracksData.tracks) && allTracksData.tracks.length > 0) {
      console.log(`Using sorted all tracks for initial setlist instead of top tracks`);
      
      return [...allTracksData.tracks]
        .filter(track => track && track.id && track.name)
        .sort((a, b) => (b.popularity || 0) - (a.popularity || 0))
        .slice(0, 5) // Only use the top 5 tracks
        .map((track: SpotifyTrack) => ({
          id: track.id,
          name: track.name,
          votes: 0, // Start with 0 votes
          userVoted: false
        }));
    }
    
    // Always ensure we have at least mock data if no real tracks are available
    console.log("No real tracks available for initial songs, using mock data");
    return generateMockSongs(5); // Reduce to 5 songs to match our requirement
  }, [topTracksData, allTracksData]);
}
