
import { useStoredArtistData } from './artist-tracks/use-stored-tracks';
import { useTopTracks } from './artist-tracks/use-top-tracks';
import { useAllTracks } from './artist-tracks/use-all-tracks';
import { useInitialSongs } from './artist-tracks/use-initial-songs';
import { getAvailableTracks } from './artist-tracks/utils';

export function useArtistTracks(spotifyArtistId: string, isLoadingShow: boolean) {
  // Fetch stored artist data
  const { data: storedArtistData, isLoading: isLoadingStoredData } = useStoredArtistData(spotifyArtistId, isLoadingShow);
  
  // Fetch top tracks
  const {
    data: topTracksData,
    isLoading: isLoadingTracks,
    error: tracksError
  } = useTopTracks(spotifyArtistId, isLoadingShow);
  
  // Fetch all tracks
  const {
    data: allTracksData,
    isLoading: isLoadingAllTracks
  } = useAllTracks(spotifyArtistId, isLoadingShow);
  
  // Prepare initial songs from top tracks or all tracks
  const initialSongs = useInitialSongs(topTracksData, allTracksData);
  
  // Function to get available tracks for the dropdown
  const getAvailableTracksForSetlist = (setlist: any[]) => {
    return getAvailableTracks(allTracksData, setlist);
  };
  
  return {
    topTracksData,
    allTracksData,
    isLoadingTracks,
    isLoadingAllTracks,
    tracksError,
    initialSongs,
    getAvailableTracks: getAvailableTracksForSetlist
  };
}
