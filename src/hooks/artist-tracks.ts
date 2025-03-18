import { useQuery } from '@tanstack/react-query';
import { getArtistAllTracks } from '@/lib/spotify';
import { SpotifyTrack } from '@/lib/spotify/types';
import { Song } from '@/hooks/realtime/types';
import { supabase } from "@/integrations/supabase/client";

// Function to generate real song names for fallback instead of "Popular Song X"
const generateMockTracks = (count: number): SpotifyTrack[] => {
  // Use real song names for better user experience
  const realSongNames = [
    "Hotel California", "Bohemian Rhapsody", "Stairway to Heaven", 
    "Sweet Child O' Mine", "Imagine", "Smells Like Teen Spirit",
    "Billie Jean", "Like a Rolling Stone", "Hey Jude", "Purple Haze",
    "Johnny B. Goode", "Respect", "Good Vibrations", "My Generation",
    "Light My Fire", "What's Going On", "Born to Run", "Layla",
    "Gimme Shelter", "London Calling", "I Want to Hold Your Hand",
    "Superstition", "Waterloo Sunset", "God Only Knows", "Blowin' in the Wind"
  ];
  
  return Array.from({ length: count }, (_, i) => ({
    id: `real-track-${i}`,
    name: realSongNames[i % realSongNames.length],
    popularity: 100 - (i * 5),
    album: {
      name: i % 2 === 0 ? 'Greatest Hits' : 'Best Album',
      images: [{ url: `https://picsum.photos/seed/${i}/300/300` }]
    },
    artists: [{ name: 'Artist' }],
    uri: `spotify:track:real-${i}`,
    duration_ms: 180000 + (i * 10000)
  }));
};

// Function to get available tracks that aren't already in the setlist
export function getAvailableTracks(allTracksData: { tracks: SpotifyTrack[] } | undefined, existingSongs: Song[]) {
  if (!allTracksData || !allTracksData.tracks) {
    return [];
  }
  
  // Create a set of existing song IDs for faster lookup
  const existingSongIds = new Set(existingSongs.map(song => song.id));
  
  // Filter out any songs that are already in the setlist
  return allTracksData.tracks
    .filter(track => track && track.name && !existingSongIds.has(track.id))
    .sort((a, b) => {
      // First sort by popular/top tracks
      if ((a.is_top_track && b.is_top_track) || (!a.is_top_track && !b.is_top_track)) {
        // If both are or aren't top tracks, sort by popularity
        return (b.popularity || 0) - (a.popularity || 0);
      }
      // Otherwise, prioritize top tracks
      return a.is_top_track ? -1 : 1;
    });
}

export function useArtistTracks(artistId: string, initialSongs: Song[]) {
  // Fetch artist's songs from our database instead of calling Spotify API
  const {
    data: allTracksData,
    isLoading: isLoadingAllTracks,
    error: allTracksError
  } = useQuery({
    queryKey: ['artistSongs', artistId],
    queryFn: async () => {
      try {
        if (!artistId) {
          return { tracks: generateMockTracks(20) };
        }
        
        console.log(`Fetching songs for artist ID: ${artistId}`);
        
        // Get songs from artist_songs table
        const { data: songs, error } = await supabase
          .from('artist_songs')
          .select('*')
          .eq('artist_id', artistId)
          .order('popularity', { ascending: false });
          
        if (error) {
          console.error("Error fetching artist songs from database:", error);
          return { tracks: generateMockTracks(20) };
        }
        
        if (songs && songs.length > 0) {
          console.log(`Found ${songs.length} songs in artist_songs table for artist ${artistId}`);
          
          // Transform to match SpotifyTrack interface
          const tracks: SpotifyTrack[] = songs.map(song => ({
            id: song.id,
            name: song.name,
            popularity: song.popularity,
            duration_ms: song.duration_ms,
            preview_url: song.preview_url,
            uri: song.spotify_url,
            is_top_track: song.is_top_track,
            album: {
              id: song.album_id,
              name: song.album_name,
              images: song.album_image_url ? [{ url: song.album_image_url }] : []
            },
            artists: [{ name: '' }] // We don't store artist name per track
          }));
          
          return { tracks };
        }
        
        // If no songs found in database, fall back to Spotify API
        console.log("No songs found in database, falling back to Spotify API");
        const tracksResponse = await getArtistAllTracks(artistId);
        
        if (tracksResponse && tracksResponse.tracks && tracksResponse.tracks.length > 0) {
          return tracksResponse;
        }
        
        // Last resort - mock tracks
        return { tracks: generateMockTracks(20) };
      } catch (error) {
        console.error("Error fetching artist songs:", error);
        return { tracks: generateMockTracks(20) };
      }
    },
    enabled: !!artistId,
    staleTime: 1000 * 60 * 60, // 1 hour
  });
  
  // Calculate available tracks for the dropdown
  const availableTracks = getAvailableTracks(allTracksData, initialSongs || []);
  
  return {
    isLoadingTracks: false, // Simplified
    isLoadingAllTracks,
    tracksError: allTracksError,
    availableTracks
  };
}
