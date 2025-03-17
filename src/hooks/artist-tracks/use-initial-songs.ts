
import { useMemo } from 'react';
import { SpotifyTrack } from '@/lib/spotify/types';

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
    
    // First try to use top tracks (these are most likely to be recognized)
    if (topTracksData?.tracks && Array.isArray(topTracksData.tracks) && topTracksData.tracks.length > 0) {
      console.log(`Using ${topTracksData.tracks.length} top tracks for initial songs`);
      
      // Filter valid tracks with actual names, not the ones with default placeholders
      const validTracks = topTracksData.tracks.filter(track => 
        track && track.id && track.name && !track.name.startsWith('Popular Song')
      );
      
      if (validTracks.length >= 5) {
        console.log(`Found ${validTracks.length} valid top tracks, selecting 5`);
        
        // Get 5 tracks with varying votes
        return validTracks.slice(0, 5).map((track: SpotifyTrack, index: number) => {
          const artistName = track.artists && track.artists[0]?.name 
            ? track.artists[0].name 
            : 'Unknown Artist';
            
          return {
            id: track.id,
            name: track.name,
            votes: 10 - index, // Descending votes for ordered display
            userVoted: false,
            albumName: track.album?.name,
            albumImageUrl: track.album?.images?.[0]?.url,
            artistName
          };
        }).sort((a, b) => b.votes - a.votes); // Sort by votes descending
      }
    }
    
    // If top tracks wasn't enough, try all tracks
    if (allTracksData?.tracks && Array.isArray(allTracksData.tracks) && allTracksData.tracks.length > 0) {
      console.log(`Using ${allTracksData.tracks.length} tracks from full catalog`);
      
      // Filter valid tracks with real names
      const validTracks = allTracksData.tracks.filter(track => 
        track && track.id && track.name && !track.name.startsWith('Popular Song')
      );
      
      if (validTracks.length > 0) {
        console.log(`Found ${validTracks.length} valid tracks, selecting random 5`);
        
        // Get 5 random tracks with varying votes
        const randomTracks = getRandomTracks(validTracks, 5);
        
        return randomTracks.map((track: SpotifyTrack, index: number) => {
          const artistName = track.artists && track.artists[0]?.name 
            ? track.artists[0].name 
            : 'Unknown Artist';
            
          return {
            id: track.id,
            name: track.name,
            votes: 10 - index, // Descending votes
            userVoted: false,
            albumName: track.album?.name,
            albumImageUrl: track.album?.images?.[0]?.url,
            artistName
          };
        }).sort((a, b) => b.votes - a.votes); // Sort by votes
      }
    }
    
    // Last resort: If we still don't have tracks with real names, return better named placeholders
    console.log("No real tracks available for initial songs, using concrete placeholder names");
    return [
      { id: 'placeholder-1', name: 'Greatest Hits', votes: 10, userVoted: false },
      { id: 'placeholder-2', name: 'Classic Track', votes: 8, userVoted: false },
      { id: 'placeholder-3', name: 'Fan Favorite', votes: 6, userVoted: false },
      { id: 'placeholder-4', name: 'Deep Cut', votes: 4, userVoted: false },
      { id: 'placeholder-5', name: 'New Single', votes: 2, userVoted: false }
    ];
  }, [topTracksData, allTracksData]);
}
