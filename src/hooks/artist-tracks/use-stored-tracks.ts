
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { convertStoredTracks, SpotifyTrack } from '@/lib/spotify';

// Fetch stored artist data query
export function useStoredArtistData(spotifyArtistId: string, isLoadingShow: boolean) {
  return useQuery({
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
    retry: 2,
  });
}

// Helper function to get tracks from DB directly
export async function getStoredTracksFromDb(artistId: string): Promise<SpotifyTrack[] | null> {
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
