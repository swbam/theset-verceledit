
import { useStoredTracks, useStoredArtistData } from './artist-tracks/use-stored-tracks';
import { useTopTracks } from './artist-tracks/use-top-tracks';
import { useAllTracks } from './artist-tracks/use-all-tracks';
import { useInitialSongs } from './artist-tracks/use-initial-songs';
import { getAvailableTracks } from './artist-tracks/utils';
import { SpotifyTrack } from '@/lib/spotify/types';
import { Song } from './realtime/types';

export function useArtistTracks(spotifyArtistId: string, initialSongs: Song[]) {
  // Fetch stored artist data
  const { data: storedArtistData, isLoading: isLoadingStoredData } = useStoredArtistData(spotifyArtistId, false);
  
  // Fetch top tracks
  const {
    data: topTracksData,
    isLoading: isLoadingTracks,
    error: tracksError
  } = useTopTracks(spotifyArtistId, false);
  
  // Fetch all tracks
  const {
    data: allTracksData,
    isLoading: isLoadingAllTracks
  } = useAllTracks(spotifyArtistId, false);
  
  // Function to get available tracks for the dropdown
  const availableTracks = getAvailableTracks(allTracksData as { tracks?: SpotifyTrack[] }, initialSongs || []);
  
  return {
    topTracksData,
    allTracksData,
    isLoadingTracks,
    isLoadingAllTracks,
    tracksError,
    initialSongs,
    availableTracks
  };
}

export { useInitialSongs } from './artist-tracks/use-initial-songs';
