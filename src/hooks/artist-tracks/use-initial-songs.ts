
import { useMemo } from 'react';
import { SpotifyTrack } from '@/lib/spotify/types';
import { generateMockSongs } from './utils';

// Helper function to get random tracks from an array
const getRandomTracks = (tracks: SpotifyTrack[], count: number) => {
  if (!tracks || tracks.length <= count) return tracks;
  
  const shuffled = [...tracks].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
};

// Prepare initial songs from a random selection of tracks
export function useInitialSongs(
  topTracksData: { tracks?: SpotifyTrack[] } | undefined, 
  allTracksData: { tracks?: SpotifyTrack[] } | undefined
) {
  return useMemo(() => {
    console.log("Calculating initial songs. Top tracks:", 
      topTracksData?.tracks?.length, "All tracks:", allTracksData?.tracks?.length);
    
    // First try to use all tracks for a better random selection
    if (allTracksData?.tracks && Array.isArray(allTracksData.tracks) && allTracksData.tracks.length > 0) {
      console.log(`Selecting 5 random tracks from ${allTracksData.tracks.length} tracks`);
      
      // Filter valid tracks and get 5 random ones
      const validTracks = allTracksData.tracks.filter(track => track && track.id && track.name);
      const randomTracks = getRandomTracks(validTracks, 5);
      
      // Initialize with 0 votes for each song
      return randomTracks.map((track: SpotifyTrack) => ({
        id: track.id,
        name: track.name,
        votes: 0,
        userVoted: false
      }));
    }
    
    // Fallback to top tracks if all tracks aren't available
    if (topTracksData?.tracks && Array.isArray(topTracksData.tracks) && topTracksData.tracks.length > 0) {
      console.log(`Selecting 5 random tracks from ${topTracksData.tracks.length} top tracks`);
      
      // Filter valid tracks and get 5 random ones
      const validTracks = topTracksData.tracks.filter(track => track && track.id && track.name);
      const randomTracks = getRandomTracks(validTracks, 5);
      
      // Initialize with 0 votes for each song
      return randomTracks.map((track: SpotifyTrack) => ({
        id: track.id,
        name: track.name,
        votes: 0,
        userVoted: false
      }));
    }
    
    // Always ensure we have at least mock data if no real tracks are available
    console.log("No real tracks available for initial songs, using mock data");
    return generateMockSongs(5);
  }, [topTracksData, allTracksData]);
}
