import { SpotifyTrack, SpotifyApi } from './types';
import { supabase } from '@/integrations/supabase/client';

// Mock tracks generator for testing
export const generateMockTracks = (count: number = 10): SpotifyTrack[] => {
  const mockTracks: SpotifyTrack[] = [];
  const songNames = [
    "Bohemian Rhapsody", "Stairway to Heaven", "Hotel California", 
    "Sweet Child O' Mine", "Imagine", "Smells Like Teen Spirit", 
    "Billie Jean", "Like a Rolling Stone", "Purple Haze", 
    "Johnny B. Goode", "Hey Jude", "Born to Run", "Respect",
    "Good Vibrations", "Yesterday", "London Calling", "Waterloo Sunset",
    "God Save the Queen", "Gimme Shelter", "Superstition"
  ];
  
  const artistNames = [
    "Queen", "Led Zeppelin", "Eagles", "Guns N' Roses", "John Lennon",
    "Nirvana", "Michael Jackson", "Bob Dylan", "Jimi Hendrix", "Chuck Berry",
    "The Beatles", "Bruce Springsteen", "Aretha Franklin", "The Beach Boys",
    "The Kinks", "Sex Pistols", "The Rolling Stones", "Stevie Wonder"
  ];
  
  for (let i = 0; i < count; i++) {
    const randomSongIndex = Math.floor(Math.random() * songNames.length);
    const randomArtistIndex = Math.floor(Math.random() * artistNames.length);
    
    mockTracks.push({
      id: `mock-track-${i}`,
      name: songNames[randomSongIndex],
      album: {
        images: [{ url: `https://picsum.photos/seed/${i}/300/300` }]
      },
      artists: [{ name: artistNames[randomArtistIndex] }],
      uri: `spotify:track:mock-${i}`,
      duration_ms: Math.floor(Math.random() * 300000) + 120000, // 2-7 minutes
      popularity: Math.floor(Math.random() * 100)
    });
  }
  
  return mockTracks;
}

// Function to save tracks to database
export async function saveTracksToDb(artistId: string, tracks: SpotifyTrack[]) {
  if (!artistId || !tracks || !Array.isArray(tracks) || tracks.length === 0) {
    console.error("Invalid parameters for saveTracksToDb");
    return;
  }
  
  try {
    console.log(`Saving ${tracks.length} tracks for artist ${artistId} to database`);
    
    // Format tracks for database insertion
    const tracksToInsert = tracks.map(track => ({
      id: track.id,
      artist_id: artistId,
      name: track.name,
      spotify_url: track.uri,
      preview_url: track.preview_url,
      album_name: track.album?.name || null,
      album_image_url: track.album?.images && track.album.images.length > 0 ? track.album.images[0].url : null,
      duration_ms: track.duration_ms || null,
      popularity: track.popularity || null,
      last_updated: new Date().toISOString()
    }));
    
    // Insert tracks using upsert to avoid duplicates
    const { data, error } = await supabase
      .from('top_tracks')
      .upsert(tracksToInsert, { 
        onConflict: 'id',
        ignoreDuplicates: false 
      });
    
    if (error) {
      console.error("Error saving tracks to database:", error);
    } else {
      console.log(`Successfully saved tracks to database for artist ${artistId}`);
    }
    
    return data;
  } catch (error) {
    console.error("Error in saveTracksToDb:", error);
    return null;
  }
}

// Function to get stored tracks from database
export async function getStoredTracksFromDb(artistId: string): Promise<SpotifyTrack[] | null> {
  try {
    if (!artistId) return null;
    
    const { data, error } = await supabase
      .from('top_tracks')
      .select('*')
      .eq('artist_id', artistId);
    
    if (error) {
      console.error("Error fetching stored tracks:", error);
      return null;
    }
    
    if (!data || data.length === 0) {
      return null;
    }
    
    // Convert database records to SpotifyTrack format
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
  } catch (error) {
    console.error("Error in getStoredTracksFromDb:", error);
    return null;
  }
}

// Convert stored tracks from database format to SpotifyTrack format
export function convertStoredTracks(tracks: any[]): SpotifyTrack[] {
  if (!tracks || !Array.isArray(tracks)) return [];
  
  return tracks.map(track => ({
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
}

// Export these functions from another file to avoid duplication
export { generateMockTracks as mockTracks } from './mock-tracks';
