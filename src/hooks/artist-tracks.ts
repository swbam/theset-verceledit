
import { useQuery } from '@tanstack/react-query';
import { getArtistAllTracks } from '@/lib/spotify';
import { SpotifyTrack } from '@/lib/spotify/types';
import { Song } from '@/hooks/realtime/types';

// Function to generate mock tracks for fallback
const generateMockTracks = (count: number): SpotifyTrack[] => {
  return Array.from({ length: count }, (_, i) => ({
    id: `mock-track-${i}`,
    name: `Popular Song ${i + 1}`,
    popularity: 100 - (i * 5),
    album: {
      name: i % 2 === 0 ? 'Greatest Hits' : 'Best Album',
      images: [{ url: `https://picsum.photos/seed/${i}/300/300` }]
    },
    artists: [{ name: 'Mock Artist' }],
    uri: `spotify:track:mock-${i}`,
    duration_ms: 180000 + (i * 10000)
  }));
};

// Filter available tracks (not in setlist)
const getAvailableTracks = (allTracksData: { tracks?: SpotifyTrack[] } | undefined, setlist: Song[]) => {
  if (!allTracksData?.tracks || !Array.isArray(allTracksData.tracks)) {
    return generateMockTracks(15);
  }
  
  // Filter out tracks already in the setlist
  const setlistIds = new Set(setlist.map(song => song.id));
  const filteredTracks = allTracksData.tracks.filter(track => 
    track && track.id && track.name && !setlistIds.has(track.id)
  );
  
  // If no tracks available, return mock tracks
  if (filteredTracks.length === 0) {
    return generateMockTracks(15);
  }
  
  // Sort by name for easy browsing
  return filteredTracks.sort((a, b) => a.name.localeCompare(b.name));
};

export function useArtistTracks(spotifyArtistId: string, initialSongs: Song[]) {
  // Fetch all tracks
  const {
    data: allTracksData,
    isLoading: isLoadingAllTracks,
    error: allTracksError
  } = useQuery({
    queryKey: ['artistAllTracks', spotifyArtistId],
    queryFn: async () => {
      try {
        if (!spotifyArtistId) {
          return { tracks: generateMockTracks(20) };
        }
        
        const tracksResponse = await getArtistAllTracks(spotifyArtistId);
        
        if (tracksResponse && tracksResponse.tracks && tracksResponse.tracks.length > 0) {
          return tracksResponse;
        }
        
        return { tracks: generateMockTracks(20) };
      } catch (error) {
        console.error("Error fetching all tracks:", error);
        return { tracks: generateMockTracks(20) };
      }
    },
    enabled: !!spotifyArtistId,
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
