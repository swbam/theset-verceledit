
import { SpotifyTrack } from './types';
import { supabase } from '@/integrations/supabase/client';

/**
 * Safely converts stored tracks from database JSON to SpotifyTrack objects
 */
export const convertStoredTracks = (storedTracks: any): SpotifyTrack[] => {
  if (!storedTracks || !Array.isArray(storedTracks) || storedTracks.length === 0) {
    return [];
  }
  
  return storedTracks.map((track: any) => ({
    id: track.id || `unknown-${Math.random().toString(36).substring(2, 9)}`,
    name: track.name || 'Unknown Track',
    duration_ms: track.duration_ms,
    popularity: track.popularity || 50,
    preview_url: track.preview_url,
    uri: track.uri,
    album: track.album || 'Unknown Album',
    votes: track.votes || 0
  }));
};

/**
 * Save tracks to the database for future use
 */
export const saveTracksToDb = async (artistId: string, tracks: SpotifyTrack[]): Promise<void> => {
  console.log(`Saving ${tracks.length} tracks to database for artist ${artistId}`);
  
  try {
    const { error } = await supabase
      .from('artists')
      .upsert({
        id: artistId,
        stored_tracks: tracks,
        updated_at: new Date().toISOString()
      });
    
    if (error) {
      console.error('Error saving tracks to database:', error);
    } else {
      console.log('Tracks saved successfully to database');
    }
  } catch (error) {
    console.error('Error in saveTracksToDb:', error);
  }
};

/**
 * Get stored tracks from the database
 */
export const getStoredTracksFromDb = async (artistId: string): Promise<SpotifyTrack[] | null> => {
  try {
    const { data, error } = await supabase
      .from('artists')
      .select('stored_tracks, updated_at')
      .eq('id', artistId)
      .maybeSingle();
    
    if (error) {
      console.error('Error fetching stored tracks:', error);
      return null;
    }
    
    // Check if we have stored tracks and they're not too old
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    if (data && data.stored_tracks && 
        Array.isArray(data.stored_tracks) && 
        data.stored_tracks.length > 0 &&
        new Date(data.updated_at) > sevenDaysAgo) {
      
      console.log(`Retrieved ${data.stored_tracks.length} tracks from database for artist ${artistId}`);
      return convertStoredTracks(data.stored_tracks);
    }
    
    return null;
  } catch (error) {
    console.error('Error in getStoredTracksFromDb:', error);
    return null;
  }
};
