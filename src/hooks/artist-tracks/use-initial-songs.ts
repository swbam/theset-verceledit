import { useMemo } from 'react';
import { SpotifyTrack } from '@/lib/spotify/types';
import { Song } from '@/hooks/realtime/types';
import { useQuery } from '@tanstack/react-query';
import { getAllArtistTracks } from '@/lib/spotify';

// Helper function to get random tracks from an array
const getRandomTracks = (tracks: SpotifyTrack[], count: number) => {
  if (!tracks || tracks.length === 0) return [];
  
  // If we have fewer tracks than requested, return all of them
  if (tracks.length <= count) return tracks;
  
  // Fisher-Yates shuffle algorithm for better randomness
  const shuffled = [...tracks];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  
  return shuffled.slice(0, count);
};

// Prepare initial songs from a random selection of tracks
export function useInitialSongs(spotifyArtistId: string) {
  // Query to fetch all tracks for the artist
  const { data: allTracksData, isLoading, error } = useQuery({
    queryKey: ['allArtistTracks', spotifyArtistId],
    queryFn: () => getAllArtistTracks(spotifyArtistId),
    enabled: !!spotifyArtistId,
    staleTime: 1000 * 60 * 30, // 30 minutes
    retry: 3, // Retry failed requests up to 3 times
  });
  
  return useMemo(() => {
    console.log("Generating initial songs for artist ID:", spotifyArtistId);
    
    // If we're still loading, return an empty array
    if (isLoading) {
      console.log("Still loading tracks data...");
      return [];
    }
    
    // If there was an error, log it and use fallback
    if (error) {
      console.error("Error loading tracks:", error);
    }
    
    // If we have tracks from the API, use those
    if (allTracksData?.tracks && allTracksData.tracks.length > 0) {
      console.log(`Selecting from ${allTracksData.tracks.length} available tracks`);
      
      // Get 5 random tracks from the artist's catalog
      const randomTracks = getRandomTracks(allTracksData.tracks, 5);
      
      if (randomTracks.length === 0) {
        console.warn("No random tracks selected, using fallback");
        return getFallbackSongs(spotifyArtistId);
      }
      
      const initialSongs: Song[] = randomTracks.map(track => ({
        id: track.id,
        name: track.name || 'Unknown Track',
        votes: 0, // Always start with zero votes
        userVoted: false,
        albumName: track.album?.name,
        albumImageUrl: track.album?.images?.[0]?.url,
        artistName: track.artists?.[0]?.name
      }));
      
      console.log(`Selected ${initialSongs.length} random tracks for initial setlist:`, 
        initialSongs.map(song => song.name).join(', '));
      return initialSongs;
    }
    
    // Fallback to placeholder songs if we don't have actual tracks
    console.log("No tracks available, using placeholder songs");
    return getFallbackSongs(spotifyArtistId);
  }, [spotifyArtistId, allTracksData, isLoading, error]);
}

// Fallback songs when we can't get real tracks
function getFallbackSongs(spotifyArtistId: string): Song[] {
  return [
    { id: `track-${spotifyArtistId}-1`, name: 'Greatest Hits', votes: 0, userVoted: false },
    { id: `track-${spotifyArtistId}-2`, name: 'Classic Track', votes: 0, userVoted: false },
    { id: `track-${spotifyArtistId}-3`, name: 'Fan Favorite', votes: 0, userVoted: false },
    { id: `track-${spotifyArtistId}-4`, name: 'Deep Cut', votes: 0, userVoted: false },
    { id: `track-${spotifyArtistId}-5`, name: 'New Single', votes: 0, userVoted: false }
  ];
}
