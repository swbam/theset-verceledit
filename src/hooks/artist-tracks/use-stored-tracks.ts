
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { SpotifyTrack } from '@/lib/spotify/types';

// Fetch stored tracks directly from the artist's stored_tracks column
export function useStoredTracks(artistId: string, enabled: boolean = true) {
  return useQuery({
    queryKey: ['storedTracks', artistId],
    queryFn: async () => {
      try {
        // First check if we have stored tracks in the artist's record
        const { data: artist, error: artistError } = await supabase
          .from('artists')
          .select('stored_tracks')
          .eq('id', artistId)
          .maybeSingle();
        
        if (artistError) {
          console.error('Error fetching artist stored tracks:', artistError);
          return [];
        }
        
        if (artist?.stored_tracks && Array.isArray(artist.stored_tracks)) {
          console.log(`Found ${artist.stored_tracks.length} stored tracks in artist record`);
          return artist.stored_tracks as SpotifyTrack[];
        }
        
        // Fallback to top_tracks table if stored_tracks is empty
        console.log('No stored_tracks found, falling back to top_tracks table');
        const { data: topTracks, error: tracksError } = await supabase
          .from('top_tracks')
          .select('*')
          .eq('artist_id', artistId);
        
        if (tracksError) {
          console.error('Error fetching stored tracks from top_tracks:', tracksError);
          return [];
        }
        
        // Transform the data to match the SpotifyTrack interface
        const tracks: SpotifyTrack[] = topTracks.map(track => ({
          id: track.id,
          name: track.name,
          popularity: track.popularity,
          preview_url: track.preview_url,
          uri: track.spotify_url,
          album: {
            name: track.album_name,
            images: track.album_image_url ? [{ url: track.album_image_url }] : []
          },
          artists: [{ name: '' }] // We don't have artist name in the top_tracks table
        }));
        
        return tracks;
      } catch (error) {
        console.error('Error in useStoredTracks:', error);
        return [];
      }
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
      
      // Calculate track count from stored_tracks if available
      let trackCount = 0;
      if (artist.stored_tracks && Array.isArray(artist.stored_tracks)) {
        trackCount = artist.stored_tracks.length;
      } else {
        // Fallback to counting from top_tracks table
        const { count, error: countError } = await supabase
          .from('top_tracks')
          .select('*', { count: 'exact', head: true })
          .eq('artist_id', artistId);
        
        if (countError) {
          console.error('Error fetching track count:', countError);
        } else {
          trackCount = count || 0;
        }
      }
      
      // Return artist with track count
      return {
        ...artist,
        trackCount
      };
    },
    enabled: !!artistId && !isLoadingShow,
    staleTime: 1000 * 60 * 60, // 1 hour
  });
}
