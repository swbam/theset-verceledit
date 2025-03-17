
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
      console.log(`Selecting random tracks from ${allTracksData.tracks.length} tracks`);
      
      // Filter valid tracks and get random ones (between 5-10 tracks for variety)
      const validTracks = allTracksData.tracks.filter(track => track && track.id && track.name);
      const randomCount = Math.min(Math.max(5, Math.floor(validTracks.length / 4)), 10);
      const randomTracks = getRandomTracks(validTracks, randomCount);
      
      console.log(`Selected ${randomTracks.length} random tracks for initial songs`);
      
      // Initialize with varying votes (0-10) for each song to make it look realistic
      return randomTracks.map((track: SpotifyTrack, index: number) => {
        const randomVotes = Math.floor(Math.random() * 10);
        return {
          id: track.id,
          name: track.name,
          votes: 10 - index, // Descending votes for ordered display
          userVoted: false,
          // Add album and artist information if available
          albumName: track.album?.name,
          albumImageUrl: track.album?.images?.[0]?.url,
          artistName: track.artists?.[0]?.name
        };
      }).sort((a, b) => b.votes - a.votes); // Sort by votes descending
    }
    
    // Fallback to top tracks if all tracks aren't available
    if (topTracksData?.tracks && Array.isArray(topTracksData.tracks) && topTracksData.tracks.length > 0) {
      console.log(`Selecting random tracks from ${topTracksData.tracks.length} top tracks`);
      
      // Filter valid tracks and get random ones
      const validTracks = topTracksData.tracks.filter(track => track && track.id && track.name);
      const randomTracks = getRandomTracks(validTracks, 5);
      
      console.log(`Selected ${randomTracks.length} random tracks from top tracks`);
      
      // Initialize with varying votes for each song
      return randomTracks.map((track: SpotifyTrack, index: number) => ({
        id: track.id,
        name: track.name,
        votes: 10 - index, // Descending votes
        userVoted: false,
        albumName: track.album?.name,
        albumImageUrl: track.album?.images?.[0]?.url,
        artistName: track.artists?.[0]?.name
      })).sort((a, b) => b.votes - a.votes); // Sort by votes
    }
    
    // Always ensure we have at least mock data if no real tracks are available
    console.log("No real tracks available for initial songs, using mock data");
    return generateMockSongs(5);
  }, [topTracksData, allTracksData]);
}
