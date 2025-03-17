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
        return {
          tracks: Array.from({ length: 5 }, (_, i) => ({
            id: `mock-track-${i}`,
            name: `Track ${i + 1}`,
            popularity: 70 - i * 5
          }))
        };
      }
    },
    enabled: !!spotifyArtistId && !isLoadingShow,
    retry: 2,
  });

  // Fetch all tracks - prioritize cached data
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
        // First check if stored data is already available
        const storedTracks = await getStoredTracksFromDb(spotifyArtistId);
        if (storedTracks && storedTracks.length > 10) {
          console.log(`Using ${storedTracks.length} cached tracks from database`);
          return { tracks: storedTracks };
        }
        
        // Otherwise fetch from Spotify API (this will also store the tracks in DB)
        const tracks = await getArtistAllTracks(spotifyArtistId);
        console.log(`Fetched ${tracks.tracks?.length || 0} tracks in total`);
        return tracks;
      } catch (error) {
        console.error("Error fetching all tracks:", error);
        return {
          tracks: Array.from({ length: 20 }, (_, i) => ({
            id: `mock-track-${i}`,
            name: `Song ${i + 1}`,
            popularity: Math.floor(Math.random() * 100)
          }))
        };
      }
    },
    enabled: !!spotifyArtistId && !isLoadingShow,
    retry: 2,
    staleTime: 1000 * 60 * 60, // 1 hour - keep data fresh for longer
  });

  // Prepare initial songs from top tracks or all tracks if top tracks not available
  const initialSongs = useMemo(() => {
    if (!topTracksData?.tracks || !Array.isArray(topTracksData.tracks) || topTracksData.tracks.length === 0) {
      if (allTracksData?.tracks && Array.isArray(allTracksData.tracks) && allTracksData.tracks.length > 0) {
        // Use a slice of all tracks sorted by popularity if top tracks are unavailable
        console.log("Using sorted all tracks instead of top tracks");
        return [...allTracksData.tracks]
          .sort((a, b) => (b.popularity || 0) - (a.popularity || 0))
          .slice(0, 10)
          .map((track: SpotifyTrack) => ({
            id: track.id,
            name: track.name,
            votes: track.popularity ? Math.floor(track.popularity / 20) : 0,
            userVoted: false
          }));
      }
      
      // If no tracks are available, return mock data
      console.log("Providing mock initial songs as fallback");
      return Array.from({ length: 5 }, (_, i) => ({
        id: `mock-track-${i}`,
        name: `Popular Song ${i + 1}`,
        votes: 10 - i,
        userVoted: false
      }));
    }
    
    console.log(`Converting ${topTracksData.tracks.length} top tracks to setlist items`);
    
    return topTracksData.tracks.map((track: SpotifyTrack) => ({
      id: track.id,
      name: track.name,
      votes: track.popularity ? Math.floor(track.popularity / 20) : 0,
      userVoted: false
    }));
  }, [topTracksData, allTracksData]);

  // Filter available tracks (not in setlist)
  const getAvailableTracks = (setlist: any[]) => {
    if (!allTracksData?.tracks || !Array.isArray(allTracksData.tracks) || !setlist) {
      console.log("No tracks available for filtering, providing mock tracks");
      // Return mock tracks if real data isn't available
      return Array.from({ length: 15 }, (_, i) => ({
        id: `mock-available-${i}`,
        name: `Available Song ${i + 1}`
      }));
    }
    
    const setlistIds = new Set(setlist.map(song => song.id));
    
    const filteredTracks = allTracksData.tracks
      .filter((track: SpotifyTrack) => !setlistIds.has(track.id) && track.name);
    
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

// Helper function to get tracks from DB directly
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
