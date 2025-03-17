
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { getArtistTopTracks, getArtistAllTracks } from '@/lib/spotify';
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
      
      console.log(`Stored artist data for ${spotifyArtistId}:`, data);
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
        const tracks = await getArtistTopTracks(spotifyArtistId, 5);
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
          ] 
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
      
      if (storedArtistData?.stored_tracks && Array.isArray(storedArtistData.stored_tracks)) {
        console.log("Using stored tracks from database:", storedArtistData.stored_tracks.length);
        return { tracks: storedArtistData.stored_tracks };
      }
      
      try {
        const tracks = await getArtistAllTracks(spotifyArtistId);
        
        if (tracks && tracks.tracks && tracks.tracks.length > 0) {
          console.log(`Storing ${tracks.tracks.length} tracks in database for artist ${spotifyArtistId}`);
          const { error } = await supabase
            .from('artists')
            .update({ 
              stored_tracks: tracks.tracks,
              updated_at: new Date().toISOString()
            })
            .eq('id', spotifyArtistId);
          
          if (error) {
            console.error("Error storing tracks in database:", error);
          } else {
            console.log("Successfully stored tracks in database");
          }
        }
        
        return tracks;
      } catch (error) {
        console.error("Error fetching all tracks:", error);
        // Return some mock data if the API fails
        return { 
          tracks: [
            { id: 'mock1', name: 'Hit Song 1' },
            { id: 'mock2', name: 'Hit Song 2' },
            { id: 'mock3', name: 'Hit Song 3' },
            { id: 'mock4', name: 'Deep Cut 1' },
            { id: 'mock5', name: 'Deep Cut 2' },
            { id: 'mock6', name: 'Acoustic Version' },
            { id: 'mock7', name: 'Live Version' },
            { id: 'mock8', name: 'Remix' },
            { id: 'mock9', name: 'Extended Mix' },
            { id: 'mock10', name: 'Collaboration Track' }
          ] 
        };
      }
    },
    enabled: !!spotifyArtistId && !isLoadingShow && !isLoadingStoredData,
    retry: 2,
  });

  // Prepare initial songs from top tracks
  const initialSongs = useMemo(() => {
    if (!topTracksData?.tracks || !Array.isArray(topTracksData.tracks) || topTracksData.tracks.length === 0) {
      console.log("No top tracks data available or empty array");
      return [];
    }
    
    console.log(`Converting ${topTracksData.tracks.length} top tracks to setlist items`);
    
    return topTracksData.tracks.map((track: any) => ({
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
      .filter((track: any) => !setlistIds.has(track.id))
      .sort((a: any, b: any) => a.name.localeCompare(b.name));
    
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
