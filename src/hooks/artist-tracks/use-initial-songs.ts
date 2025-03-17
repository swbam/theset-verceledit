
import { useMemo } from 'react';
import { SpotifyTrack } from '@/lib/spotify/types';
import { Song } from '@/hooks/realtime/types';

// Helper function to get random tracks from an array
const getRandomTracks = (tracks: SpotifyTrack[], count: number) => {
  if (!tracks || tracks.length <= count) return tracks;
  
  const shuffled = [...tracks].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
};

// Prepare initial songs from a random selection of tracks
export function useInitialSongs(spotifyArtistId: string) {
  // We're going to simplify this function to return a hard-coded set of initial songs
  // This will provide us with consistent data for the setlist when first loading
  return useMemo(() => {
    console.log("Generating initial songs for artist ID:", spotifyArtistId);
    
    // Create an array of placeholder songs with track IDs that match the database schema
    const initialSongs: Song[] = [
      { id: `track-${spotifyArtistId}-1`, name: 'Greatest Hits', votes: 10, userVoted: false },
      { id: `track-${spotifyArtistId}-2`, name: 'Classic Track', votes: 8, userVoted: false },
      { id: `track-${spotifyArtistId}-3`, name: 'Fan Favorite', votes: 6, userVoted: false },
      { id: `track-${spotifyArtistId}-4`, name: 'Deep Cut', votes: 4, userVoted: false },
      { id: `track-${spotifyArtistId}-5`, name: 'New Single', votes: 2, userVoted: false }
    ];
    
    console.log("Generated initial songs:", initialSongs.length);
    return initialSongs;
  }, [spotifyArtistId]);
}
