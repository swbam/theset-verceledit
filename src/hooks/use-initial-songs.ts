import { useQuery } from '@tanstack/react-query';
import { SpotifyTrack } from '@/lib/spotify/types';
import { Song } from '@/hooks/realtime/types';
import { getRandomArtistSongs } from '@/lib/api/db/artist-utils';

// Default song names for fallback if we can't get enough tracks
const DEFAULT_SONG_NAMES = [
  'Greatest Hit',
  'Fan Favorite',
  'Classic Track',
  'Popular Single',
  'Deep Cut'
];

/**
 * Hook to get initial songs for a setlist
 * Pulls random songs from the artist_songs table in our database
 * Always returns exactly 5 songs with 0 votes
 */
export function useInitialSongs(artistId: string, count: number = 5): Song[] {
  const { data: initialSongs } = useQuery({
    queryKey: ['initialSetlistSongs', artistId],
    queryFn: async () => {
      try {
        if (!artistId) {
          console.warn("No artist ID provided for initial songs");
          return generateDefaultSongs(count);
        }
        
        // Get random songs from our database
        const randomSongs = await getRandomArtistSongs(artistId, count);
        
        // If we have at least one song, use those (potentially with fallbacks)
        if (randomSongs && randomSongs.length > 0) {
          // Transform the songs we got from the database
          const songs = randomSongs.map((track, index) => ({
            id: track.id,
            name: track.name,
            votes: 0, // Ensure all songs have 0 votes initially
            userVoted: false,
            position: index + 1,
            albumName: track.album_name,
            albumImageUrl: track.album_image_url
          }));
          
          // If we don't have enough songs, fill in with defaults
          if (songs.length < count) {
            console.log(`Only got ${songs.length} songs, filling in with defaults to reach ${count}`);
            return fillWithDefaultSongs(songs, count, artistId);
          }
          
          return songs;
        }
        
        // If we couldn't find any songs, return default placeholder songs
        console.log(`No songs found for artist ${artistId}, using default songs`);
        return generateDefaultSongs(count, artistId);
      } catch (error) {
        console.error("Error fetching initial songs:", error);
        return generateDefaultSongs(count, artistId);
      }
    },
    enabled: !!artistId,
    staleTime: 1000 * 60 * 60, // 1 hour - no need to refresh initial songs frequently
  });
  
  // Ensure we always return exactly 5 songs with 0 votes
  if (!initialSongs || initialSongs.length === 0) {
    return generateDefaultSongs(count, artistId);
  }
  
  // Ensure all songs have 0 votes (in case any had votes)
  const songsWithZeroVotes = initialSongs.map(song => ({
    ...song,
    votes: 0,
    userVoted: false
  }));
  
  // If we somehow have less than the requested count, fill in with defaults
  if (songsWithZeroVotes.length < count) {
    return fillWithDefaultSongs(songsWithZeroVotes, count, artistId);
  }
  
  // If we have more than requested, slice to get the exact count
  if (songsWithZeroVotes.length > count) {
    return songsWithZeroVotes.slice(0, count);
  }
  
  return songsWithZeroVotes;
}

/**
 * Generate default placeholder songs for when we can't fetch real ones
 */
function generateDefaultSongs(count: number = 5, artistId?: string): Song[] {
  return Array.from({ length: count }, (_, index) => ({
    id: artistId ? `default-${artistId}-${index}` : `default-song-${index}`,
    name: DEFAULT_SONG_NAMES[index] || `Song ${index + 1}`,
    votes: 0,
    userVoted: false,
    position: index + 1
  }));
}

/**
 * Fill an incomplete song list with defaults to reach the requested count
 */
function fillWithDefaultSongs(songs: Song[], targetCount: number, artistId?: string): Song[] {
  const songsCopy = [...songs];
  const namesUsed = new Set(songsCopy.map(song => song.name));
  
  while (songsCopy.length < targetCount) {
    // Find a name that isn't already used
    let name = DEFAULT_SONG_NAMES[songsCopy.length];
    if (namesUsed.has(name)) {
      name = `Song ${songsCopy.length + 1}`;
    }
    namesUsed.add(name);
    
    songsCopy.push({
      id: artistId ? `default-${artistId}-${songsCopy.length}` : `default-song-${songsCopy.length}`,
      name,
      votes: 0,
      userVoted: false,
      position: songsCopy.length + 1
    });
  }
  
  return songsCopy;
} 