
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { SpotifyTrack } from '@/lib/spotify/types';

// Fetch stored tracks from database (from the artists table's stored_tracks field)
export function useStoredTracks(artistId: string, enabled: boolean = true) {
  return useQuery({
    queryKey: ['storedTracks', artistId],
    queryFn: async () => {
      // Check if we have stored tracks in the artists table's stored_tracks field
      const { data, error } = await supabase
        .from('artists')
        .select('stored_tracks')
        .eq('id', artistId)
        .single();
      
      if (error) {
        console.error('Error fetching stored tracks:', error);
        return [];
      }
      
      // Return the stored_tracks array or an empty array if it doesn't exist
      return (data?.stored_tracks as SpotifyTrack[] || []);
    },
    enabled: !!artistId && enabled,
    staleTime: 1000 * 60 * 60, // 1 hour
  });
}

// Fetch stored artist data including track count
export function useStoredArtistData(artistId: string, isLoadingShow: boolean) {
  return useQuery({
    queryKey: ['storedArtistData', artistId],
    queryFn: async () => {
      // Check if we have the artist in database
      const { data, error } = await supabase
        .from('artists')
        .select('*')
        .eq('id', artistId)
        .single();
      
      if (error) {
        console.error('Error fetching stored artist data:', error);
        return null;
      }
      
      return data;
    },
    enabled: !!artistId && !isLoadingShow,
    staleTime: 1000 * 60 * 60, // 1 hour
  });
}
