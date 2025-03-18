import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { getArtistTopTracks, getArtistAllTracks, SpotifyTrack, convertStoredTracks } from '@/lib/spotify';
import { useMemo } from 'react';
import { getStoredTracksForArtist } from '@/lib/api/database-utils';

export function useArtistTracks(spotifyArtistId: string, isLoadingShow: boolean) {
  // Fetch stored artist data - prioritize this over API calls
  const {
    data: storedArtistData,
    isLoading: isLoadingStoredData
  } = useQuery({
    queryKey: ['storedArtistData', spotifyArtistId],
    queryFn: async () => {
      if (!spotifyArtistId) return null;
      
      // First, try to get tracks directly from our database
      const storedTracks = await getStoredTracksForArtist(spotifyArtistId);
      if (storedTracks && storedTracks.length > 0) {
        console.log(`Using ${storedTracks.length} tracks directly from database for artist ${spotifyArtistId}`);
        return { id: spotifyArtistId, stored_tracks: storedTracks };
      }
      
      // If not found, fall back to standard query
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
      const convertedTracks = convertStoredTracks(data?.stored_tracks);
      const tracksCount = convertedTracks.length;
      
      console.log(`Stored artist data for ${spotifyArtistId}:`, tracksCount, 'tracks');
      return data;
    },
    enabled: !!spotifyArtistId && !isLoadingShow,
  });
  
  // Fetch top tracks only if we don't have stored tracks
  const {
    data: topTracksData,
    isLoading: isLoadingTracks,
    error: tracksError
  } = useQuery({
    queryKey: ['artistTopTracks', spotifyArtistId],
    queryFn: async () => {
      // If we already have stored tracks, use those instead of making an API call
      if (storedArtistData?.stored_tracks && Array.isArray(storedArtistData.stored_tracks) && storedArtistData.stored_tracks.length > 0) {
        console.log(`Using ${storedArtistData.stored_tracks.length} stored tracks instead of fetching top tracks`);
        // Sort by popularity to get the top tracks
        const sortedTracks = [...storedArtistData.stored_tracks]
          .sort((a: any, b: any) => (b.popularity || 0) - (a.popularity || 0))
          .slice(0, 10);
        return { tracks: sortedTracks };
      }
      
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
    enabled: !!spotifyArtistId && !isLoadingShow && !isLoadingStoredData,
    retry: 2,
  });

  // Fetch all tracks - prioritize stored tracks
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
      
      // First check if stored tracks are already available from the initial query
      if (storedArtistData?.stored_tracks && Array.isArray(storedArtistData.stored_tracks) && storedArtistData.stored_tracks.length > 0) {
        console.log(`Using ${storedArtistData.stored_tracks.length} stored tracks from initial query`);
        return { tracks: storedArtistData.stored_tracks as unknown as SpotifyTrack[] };
      }
      
      console.log(`Fetching all tracks for artist ID: ${spotifyArtistId}`);
      try {
        // Get tracks from database first
        const storedTracks = await getStoredTracksForArtist(spotifyArtistId);
        if (storedTracks && storedTracks.length > 0) {
          console.log(`Using ${storedTracks.length} stored tracks from separate database query`);
          return { tracks: storedTracks as SpotifyTrack[] };
        }
        
        // Otherwise fetch from Spotify API and store them
        const tracks = await getArtistAllTracks(spotifyArtistId);
        console.log(`Fetched ${tracks.tracks?.length || 0} tracks in total from Spotify API`);
        return tracks;
      } catch (error) {
        console.error("Error fetching all tracks:", error);
        // Return more comprehensive mock data if the API fails
        return { 
          tracks: [
            { id: 'mock1', name: 'A Hit Song 1', album: 'Album 1', popularity: 90 },
            { id: 'mock2', name: 'B Hit Song 2', album: 'Album 1', popularity: 85 },
            { id: 'mock3', name: 'C Hit Song 3', album: 'Album 2', popularity: 80 },
            { id: 'mock4', name: 'D Deep Cut 1', album: 'Album 2', popularity: 60 },
            { id: 'mock5', name: 'E Deep Cut 2', album: 'Album 3', popularity: 55 },
            { id: 'mock6', name: 'F Acoustic Version', album: 'Album 3', popularity: 70 },
            { id: 'mock7', name: 'G Live Version', album: 'Live Album', popularity: 75 },
            { id: 'mock8', name: 'H Remix', album: 'Remix Album', popularity: 65 },
            { id: 'mock9', name: 'I Extended Mix', album: 'Remix Album', popularity: 50 },
            { id: 'mock10', name: 'J Collaboration Track', album: 'Featuring', popularity: 85 },
            { id: 'mock11', name: 'K Rare B-Side', album: 'B-Sides', popularity: 40 },
            { id: 'mock12', name: 'L Demo Version', album: 'Demos', popularity: 35 },
            { id: 'mock13', name: 'M Unreleased Track', album: 'Unreleased', popularity: 30 },
            { id: 'mock14', name: 'N Featured Artist Track', album: 'Collaborations', popularity: 75 },
            { id: 'mock15', name: 'O Another Hit', album: 'Greatest Hits', popularity: 88 }
          ] as SpotifyTrack[]
        };
      }
    },
    enabled: !!spotifyArtistId && !isLoadingShow,
    retry: 2,
    staleTime: 1000 * 60 * 60, // 1 hour - keep data fresh for longer
  });

  // Prepare initial songs from top tracks or stored tracks
  const initialSongs = useMemo(() => {
    // If we have stored tracks, use those
    if (storedArtistData?.stored_tracks && Array.isArray(storedArtistData.stored_tracks) && storedArtistData.stored_tracks.length > 0) {
      const topStoredTracks = [...storedArtistData.stored_tracks]
        .sort((a: any, b: any) => (b.popularity || 0) - (a.popularity || 0))
        .slice(0, 10);
      
      console.log(`Converting ${topStoredTracks.length} top stored tracks to setlist items`);
      
      return topStoredTracks.map((track: any) => ({
        id: track.id,
        name: track.name,
        votes: track.popularity ? Math.floor(track.popularity / 20) : 0,
        userVoted: false
      }));
    }
    
    // Otherwise use top tracks from API
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
  }, [topTracksData, storedArtistData]);

  // Filter available tracks (not in setlist)
  const getAvailableTracks = (setlist: any[]) => {
    // First check if we have stored tracks
    if (storedArtistData?.stored_tracks && Array.isArray(storedArtistData.stored_tracks) && storedArtistData.stored_tracks.length > 0) {
      const setlistIds = new Set(setlist.map(song => song.id));
      
      const filteredTracks = storedArtistData.stored_tracks
        .filter((track: any) => !setlistIds.has(track.id));
      
      console.log(`${filteredTracks.length} stored tracks available after filtering out ${setlist.length} setlist tracks`);
      return filteredTracks;
    }
    
    // Otherwise use all tracks from API
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
    getAvailableTracks,
    storedTracksData: storedArtistData?.stored_tracks
  };
}

// Helper function to get tracks from DB directly - Now moved to database-utils.ts
async function getStoredTracksFromDb(artistId: string): Promise<SpotifyTrack[] | null> {
  try {
    const { data, error } = await supabase
      .from('artists')
      .select('stored_tracks, updated_at')
      .eq('id', artistId)
      .maybeSingle();
    
    // Check if the stored tracks exist and aren't too old
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    if (!error && data && data.stored_tracks && 
        Array.isArray(data.stored_tracks) && 
        data.stored_tracks.length > 0 &&
        new Date(data.updated_at) > sevenDaysAgo) {
      
      return data.stored_tracks as unknown as SpotifyTrack[];
    }
    
    return null;
  } catch (error) {
    console.error("Error directly accessing stored tracks:", error);
    return null;
  }
}
