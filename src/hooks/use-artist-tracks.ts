
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { getArtistTopTracks, getArtistAllTracks, SpotifyTrack, convertStoredTracks } from '@/lib/spotify';
import { useMemo } from 'react';

export function useArtistTracks(spotifyArtistId: string, isLoadingShow: boolean) {
  // Fetch stored artist data
  const {
    data: storedArtistData,
    isLoading: isLoadingStoredData
  } = useQuery({
    queryKey: ['storedArtistData', spotifyArtistId],
    queryFn: async () => {
      if (!spotifyArtistId) return null;
      
      const { data, error } = await supabase
        .from('artists')
        .select('id, stored_tracks')
        .eq('id', spotifyArtistId)
        .maybeSingle();
      
      if (error) {
        console.error("Error fetching stored artist data:", error);
        return null;
      }
      
      // Safely check if stored_tracks exists and is an array
      const storedTracks = convertStoredTracks(data?.stored_tracks);
      const tracksCount = storedTracks.length;
      
      console.log(`Stored artist data for ${spotifyArtistId}:`, tracksCount, 'tracks');
      return data;
    },
    enabled: !!spotifyArtistId && !isLoadingShow,
  });
  
  // Fetch top tracks
  const {
    data: topTracksData,
    isLoading: isLoadingTracks,
    error: tracksError
  } = useQuery({
    queryKey: ['artistTopTracks', spotifyArtistId],
    queryFn: async () => {
      console.log(`Fetching top tracks for artist ID: ${spotifyArtistId}`);
      if (!spotifyArtistId) {
        console.error("No valid Spotify artist ID available");
        return { tracks: [] };
      }
      
      try {
        const tracks = await getArtistTopTracks(spotifyArtistId, 10);
        console.log(`Fetched ${tracks.tracks?.length || 0} top tracks`);
        return tracks;
      } catch (error) {
        console.error("Error fetching tracks:", error);
        // Return some mock data if the API fails
        return { 
          tracks: [
            { id: 'mock1', name: 'Track 1', popularity: 80 },
            { id: 'mock2', name: 'Track 2', popularity: 75 },
            { id: 'mock3', name: 'Track 3', popularity: 70 },
            { id: 'mock4', name: 'Track 4', popularity: 65 },
            { id: 'mock5', name: 'Track 5', popularity: 60 }
          ] as SpotifyTrack[]
        };
      }
    },
    enabled: !!spotifyArtistId && !isLoadingShow,
    retry: 2,
  });

  // Fetch all tracks
  const {
    data: allTracksData,
    isLoading: isLoadingAllTracks
  } = useQuery({
    queryKey: ['artistAllTracks', spotifyArtistId],
    queryFn: async () => {
      if (!spotifyArtistId) {
        console.error("No valid Spotify artist ID available");
        return { tracks: [] };
      }
      
      console.log(`Fetching all tracks for artist ID: ${spotifyArtistId}`);
      try {
        const tracks = await getArtistAllTracks(spotifyArtistId);
        console.log(`Fetched ${tracks.tracks?.length || 0} tracks in total`);
        return tracks;
      } catch (error) {
        console.error("Error fetching all tracks:", error);
        // Return some mock data if the API fails
        return { 
          tracks: [
            { id: 'mock1', name: 'Hit Song 1', album: 'Album 1', popularity: 90 },
            { id: 'mock2', name: 'Hit Song 2', album: 'Album 1', popularity: 85 },
            { id: 'mock3', name: 'Hit Song 3', album: 'Album 2', popularity: 80 },
            { id: 'mock4', name: 'Deep Cut 1', album: 'Album 2', popularity: 60 },
            { id: 'mock5', name: 'Deep Cut 2', album: 'Album 3', popularity: 55 },
            { id: 'mock6', name: 'Acoustic Version', album: 'Album 3', popularity: 70 },
            { id: 'mock7', name: 'Live Version', album: 'Live Album', popularity: 75 },
            { id: 'mock8', name: 'Remix', album: 'Remix Album', popularity: 65 },
            { id: 'mock9', name: 'Extended Mix', album: 'Remix Album', popularity: 50 },
            { id: 'mock10', name: 'Collaboration Track', album: 'Featuring', popularity: 85 }
          ] as SpotifyTrack[]
        };
      }
    },
    enabled: !!spotifyArtistId && !isLoadingShow,
    retry: 2,
  });

  // Prepare initial songs from top tracks
  const initialSongs = useMemo(() => {
    if (!topTracksData?.tracks || !Array.isArray(topTracksData.tracks) || topTracksData.tracks.length === 0) {
      console.log("No top tracks data available or empty array");
      return [];
    }
    
    console.log(`Converting ${topTracksData.tracks.length} top tracks to setlist items`);
    
    return topTracksData.tracks.map((track: SpotifyTrack) => ({
      id: track.id,
      name: track.name,
      votes: track.popularity ? Math.floor(track.popularity / 20) : 0,
      userVoted: false
    }));
  }, [topTracksData]);

  // Filter available tracks (not in setlist)
  const getAvailableTracks = (setlist: any[]) => {
    if (!allTracksData?.tracks || !Array.isArray(allTracksData.tracks) || !setlist) {
      console.log("No tracks available for filtering");
      return [];
    }
    
    const setlistIds = new Set(setlist.map(song => song.id));
    
    const filteredTracks = allTracksData.tracks
      .filter((track: SpotifyTrack) => !setlistIds.has(track.id));
    
    console.log(`${filteredTracks.length} tracks available after filtering out ${setlist.length} setlist tracks`);
    return filteredTracks;
  };

  return {
    topTracksData,
    allTracksData,
    isLoadingTracks,
    isLoadingAllTracks,
    tracksError,
    initialSongs,
    getAvailableTracks
  };
}
