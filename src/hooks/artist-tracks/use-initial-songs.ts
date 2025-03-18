import { useMemo } from 'react';
import { SpotifyTrack } from '@/lib/spotify/types';
import { Song } from '@/hooks/realtime/types';
import { useQuery } from '@tanstack/react-query';
import { getAllArtistTracks } from '@/lib/spotify';

// Helper function to get random tracks from an array
const getRandomTracks = (tracks: SpotifyTrack[], count: number) => {
  if (!tracks || tracks.length <= count) return tracks;
  
  const shuffled = [...tracks].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
};

// Prepare initial songs from a random selection of tracks
export function useInitialSongs(spotifyArtistId: string) {
  // Query to fetch all tracks for the artist
  const { data: allTracksData } = useQuery({
    queryKey: ['allArtistTracks', spotifyArtistId],
    queryFn: () => getAllArtistTracks(spotifyArtistId),
    enabled: !!spotifyArtistId,
    staleTime: 1000 * 60 * 30, // 30 minutes
  });
  
  return useMemo(() => {
    console.log("Generating initial songs for artist ID:", spotifyArtistId);
    
    // If we have tracks from the API, use those
    if (allTracksData?.tracks && allTracksData.tracks.length > 0) {
      console.log(`Selecting from ${allTracksData.tracks.length} available tracks`);
      
      // Get 5 random tracks from the artist's catalog
      const randomTracks = getRandomTracks(allTracksData.tracks, 5);
      
      const initialSongs: Song[] = randomTracks.map(track => ({
        id: track.id,
        name: track.name || 'Unknown Track',
        votes: 0, // Always start with zero votes
        userVoted: false,
        albumName: track.album?.name,
        albumImageUrl: track.album?.images?.[0]?.url,
        artistName: track.artists?.[0]?.name
      }));
      
      console.log(`Selected ${initialSongs.length} random tracks for initial setlist`);
      return initialSongs;
    }
    
    // Fallback to placeholder songs if we don't have actual tracks
    console.log("No tracks available, using placeholder songs");
    const initialSongs: Song[] = [
      { id: `track-${spotifyArtistId}-1`, name: 'Greatest Hits', votes: 0, userVoted: false },
      { id: `track-${spotifyArtistId}-2`, name: 'Classic Track', votes: 0, userVoted: false },
      { id: `track-${spotifyArtistId}-3`, name: 'Fan Favorite', votes: 0, userVoted: false },
      { id: `track-${spotifyArtistId}-4`, name: 'Deep Cut', votes: 0, userVoted: false },
      { id: `track-${spotifyArtistId}-5`, name: 'New Single', votes: 0, userVoted: false }
    ];
    
    return initialSongs;
  }, [spotifyArtistId, allTracksData]);
}
