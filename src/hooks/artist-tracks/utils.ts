
import { SpotifyTrack } from '@/lib/spotify';

// Generate mock tracks for fallback scenarios
export function generateMockTracks(count: number): SpotifyTrack[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `mock-track-${i}`,
    name: `Song ${i + 1}`,
    popularity: 80 - (i * 3),
    album: i % 2 === 0 ? 'Album 1' : 'Album 2'
  }));
}

// Generate mock songs for initial setlist
export function generateMockSongs(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: `mock-song-${i}`,
    name: `Popular Song ${i + 1}`,
    votes: 10 - i,
    userVoted: false
  }));
}

// Filter available tracks (not in setlist)
export const getAvailableTracks = (allTracksData: { tracks?: SpotifyTrack[] } | undefined, setlist: any[]) => {
  if (!allTracksData?.tracks || !Array.isArray(allTracksData.tracks) || allTracksData.tracks.length === 0 || !setlist) {
    console.log("No tracks available for filtering, providing mock tracks");
    // Return mock tracks if real data isn't available
    return generateMockTracks(15);
  }
  
  const setlistIds = new Set(setlist.map(song => song.id));
  
  const filteredTracks = allTracksData.tracks
    .filter((track: SpotifyTrack) => !setlistIds.has(track.id) && track.name);
  
  console.log(`${filteredTracks.length} tracks available after filtering out ${setlist.length} setlist tracks`);
  
  // If after filtering we have no tracks, return mock tracks
  if (filteredTracks.length === 0) {
    console.log("No tracks available after filtering, providing mock tracks");
    return generateMockTracks(15);
  }
  
  return filteredTracks;
};
