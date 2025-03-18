import { SpotifyTrack } from '@/lib/spotify/types';

// Filter available tracks (not in setlist)
export const getAvailableTracks = (
  allTracksData: { tracks?: SpotifyTrack[] } | undefined, 
  setlist: any[]
) => {
  console.log("Getting available tracks. All tracks data:", 
    allTracksData?.tracks?.length, "Setlist length:", setlist?.length);
  
  if (!allTracksData?.tracks || !Array.isArray(allTracksData.tracks)) {
    console.log("No all tracks data available");
    return [];
  }
  
  // Make sure tracks are valid
  const validTracks = allTracksData.tracks.filter(track => track && track.id && track.name);
  
  console.log(`Valid tracks: ${validTracks.length} out of ${allTracksData.tracks.length}`);
  
  if (validTracks.length === 0) {
    return [];
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
  
  // If after filtering we have no tracks, return empty array
  if (filteredTracks.length === 0) {
    console.log("No tracks available after filtering");
    return [];
  }
  
  // Sort by name for easy browsing in dropdown
  return filteredTracks.sort((a, b) => a.name.localeCompare(b.name));
};
