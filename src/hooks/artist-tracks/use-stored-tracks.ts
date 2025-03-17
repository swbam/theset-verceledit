
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { SpotifyTrack } from '@/lib/spotify/types';

// Fetch stored tracks from the top_tracks table
export function useStoredTracks(artistId: string, enabled: boolean = true) {
  return useQuery({
    queryKey: ['storedTracks', artistId],
    queryFn: async () => {
      // Check if we have stored tracks in the top_tracks table
      const { data, error } = await supabase
        .from('top_tracks')
        .select('*')
        .eq('artist_id', artistId);
      
      if (error) {
        console.error('Error fetching stored tracks:', error);
        return [];
      }
      
      // Transform the data to match the SpotifyTrack interface
      const tracks: SpotifyTrack[] = data.map(track => ({
        id: track.id,
        name: track.name,
        popularity: track.popularity,
        preview_url: track.preview_url,
        uri: track.spotify_url,
        album: {
          name: track.album_name,
          images: track.album_image_url ? [{ url: track.album_image_url }] : []
        }
      }));
      
      return tracks;
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
      const { data: artist, error: artistError } = await supabase
        .from('artists')
        .select('*')
        .eq('id', artistId)
        .single();
      
      if (artistError) {
        console.error('Error fetching stored artist data:', artistError);
        return null;
      }
      
      // Get track count for this artist
      const { count, error: countError } = await supabase
        .from('top_tracks')
        .select('*', { count: 'exact', head: true })
        .eq('artist_id', artistId);
      
      if (countError) {
        console.error('Error fetching track count:', countError);
      }
      
      // Return artist with track count
      return {
        ...artist,
        trackCount: count || 0
      };
    },
    enabled: !!artistId && !isLoadingShow,
    staleTime: 1000 * 60 * 60, // 1 hour
  });
}
