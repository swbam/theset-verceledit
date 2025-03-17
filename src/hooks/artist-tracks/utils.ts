
import { SpotifyTrack } from '@/lib/spotify';

// Generate mock tracks for fallback scenarios
export function generateMockTracks(count: number): SpotifyTrack[] {
  console.log(`Generating ${count} mock tracks in hook utils`);
  return Array.from({ length: count }, (_, i) => ({
    id: `mock-track-${i}`,
    name: `Song ${i + 1}`,
    popularity: 80 - (i * 3),
    album: i % 2 === 0 ? 'Album 1' : 'Album 2'
  }));
}

// Generate mock songs for initial setlist
export function generateMockSongs(count: number) {
  console.log(`Generating ${count} mock songs for initial setlist`);
  return Array.from({ length: count }, (_, i) => ({
    id: `mock-song-${i}`,
    name: `Popular Song ${i + 1}`,
    votes: 10 - i,
    userVoted: false
  }));
}

// Filter available tracks (not in setlist)
export const getAvailableTracks = (allTracksData: { tracks?: SpotifyTrack[] } | undefined, setlist: any[]) => {
  console.log("Getting available tracks. All tracks data:", 
    allTracksData?.tracks?.length, "Setlist length:", setlist?.length);
  
  if (!allTracksData?.tracks || !Array.isArray(allTracksData.tracks)) {
    console.log("No all tracks data available");
    return generateMockTracks(15);
  }
  
  // Make sure tracks are valid
  let validTracks = allTracksData.tracks.filter(track => track && track.id && track.name);
  
  console.log(`Valid tracks: ${validTracks.length} out of ${allTracksData.tracks.length}`);
  
  if (validTracks.length === 0) {
    return generateMockTracks(15);
  }
  
  // Handle no setlist case
  if (!setlist || !Array.isArray(setlist) || setlist.length === 0) {
    console.log("No setlist provided, returning all valid tracks");
    return validTracks;
  }
  
  // Filter out tracks already in the setlist
  const setlistIds = new Set(setlist.map(song => song.id));
  const filteredTracks = validTracks.filter(track => !setlistIds.has(track.id));
  
  console.log(`${filteredTracks.length} tracks available after filtering out ${setlist.length} setlist tracks`);
  
  // If after filtering we have no tracks, return mock tracks
  if (filteredTracks.length === 0) {
    console.log("No tracks available after filtering, providing mock tracks");
    return generateMockTracks(15);
  }
  
  return filteredTracks;
};
