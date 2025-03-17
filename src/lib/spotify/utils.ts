import { createClient } from '@supabase/supabase-js';
import { SpotifyTrack } from '@/lib/spotify/types';

// Utility function to store tracks in database for caching
export async function storeTracksInDb(artistId: string, tracks: SpotifyTrack[]) {
  try {
    const supabase = createClient(
      import.meta.env.VITE_SUPABASE_URL as string,
      import.meta.env.VITE_SUPABASE_ANON_KEY as string
    );
    
    // First, get the artist record
    const { data: artist } = await supabase
      .from('artists')
      .select('*')
      .eq('id', artistId)
      .single();
    
    if (artist) {
      // Convert tracks to serializable JSON format
      const tracksJSON = tracks.map(track => ({
        id: track.id,
        name: track.name,
        uri: track.uri,
        popularity: track.popularity,
        preview_url: track.preview_url,
        album: track.album ? {
          id: track.album.id,
          name: track.album.name,
          images: track.album.images
        } : null
      }));
      
      // Update the artist with the stored tracks
      const { error } = await supabase
        .from('artists')
        .update({ 
          stored_tracks: tracksJSON,
          updated_at: new Date().toISOString()
        })
        .eq('id', artistId);
      
      if (error) {
        console.error('Error storing tracks in DB:', error);
      } else {
        console.log(`Successfully stored ${tracks.length} tracks for artist ${artistId}`);
      }
    } else {
      console.log(`Artist ${artistId} not found in database, not storing tracks`);
    }
  } catch (error) {
    console.error('Error in storeTracksInDb:', error);
  }
}

// Utility function to get stored tracks from database
export async function getStoredTracksFromDb(artistId: string): Promise<SpotifyTrack[] | null> {
  try {
    const supabase = createClient(
      import.meta.env.VITE_SUPABASE_URL as string,
      import.meta.env.VITE_SUPABASE_ANON_KEY as string
    );
    
    // Get the artist with stored tracks
    const { data: artist } = await supabase
      .from('artists')
      .select('stored_tracks, updated_at')
      .eq('id', artistId)
      .single();
    
    if (artist?.stored_tracks) {
      // Check if the cached data is recent (less than 7 days old)
      const updatedAt = new Date(artist.updated_at);
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - updatedAt.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays <= 7) {
        // Convert the stored JSON tracks back to SpotifyTrack objects
        return artist.stored_tracks as unknown as SpotifyTrack[];
      } else {
        console.log('Stored tracks are older than 7 days, fetching fresh data');
        return null;
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error in getStoredTracksFromDb:', error);
    return null;
  }
}

// Mock data generator for tracks
export function generateMockTracks(count: number) {
  const mockTracks = [];
  for (let i = 0; i < count; i++) {
    mockTracks.push({
      id: `mock-track-${i}`,
      name: `Mock Track ${i}`,
      artists: [{ name: 'Mock Artist' }],
      album: {
        name: 'Mock Album',
        images: [{ url: 'https://via.placeholder.com/640x480' }]
      },
      uri: `spotify:track:mock-${i}`,
      popularity: Math.floor(Math.random() * 100),
      preview_url: null
    });
  }
  return mockTracks;
}
