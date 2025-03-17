
import { supabase } from '@/integrations/supabase/client';
import { SpotifyTrack, SpotifyTracksResponse } from './types';
import { Json } from '@/integrations/supabase/types';

// Safely convert stored tracks from Json to SpotifyTrack[]
export const convertStoredTracks = (storedTracks: Json | null): SpotifyTrack[] => {
  if (!storedTracks || !Array.isArray(storedTracks) || storedTracks.length === 0) {
    return [];
  }
  return storedTracks as unknown as SpotifyTrack[];
};

// Get stored tracks for an artist from database
export const getStoredTracksFromDb = async (artistId: string): Promise<SpotifyTrack[] | null> => {
  try {
    const { data: artistData, error } = await supabase
      .from('artists')
      .select('stored_tracks')
      .eq('id', artistId)
      .maybeSingle();
    
    if (error) {
      console.error(`Error fetching stored tracks for artist ${artistId}:`, error);
      return null;
    }
    
    if (!artistData || !artistData.stored_tracks) {
      return null;
    }
    
    const tracks = convertStoredTracks(artistData.stored_tracks);
    
    // If we have tracks, log and return them
    if (tracks.length > 0) {
      console.log(`Retrieved ${tracks.length} stored tracks for artist ${artistId}`);
      return tracks;
    }
    
    return null;
  } catch (error) {
    console.error("Error directly accessing stored tracks:", error);
    return null;
  }
};

// Save tracks to database for an artist
export const saveTracksToDb = async (artistId: string, tracks: SpotifyTrack[]): Promise<void> => {
  try {
    if (!tracks || !Array.isArray(tracks) || tracks.length === 0) {
      console.warn(`No tracks to save for artist ${artistId}`);
      return;
    }
    
    // Convert tracks to a JSON-compatible format but maintain type safety
    const tracksForStorage = tracks as unknown as Json;
    
    const { error } = await supabase
      .from('artists')
      .update({ 
        stored_tracks: tracksForStorage,
        updated_at: new Date().toISOString()
      })
      .eq('id', artistId);
    
    if (error) {
      console.error(`Error saving tracks for artist ${artistId}:`, error);
      
      // Try to create the artist if update failed (might not exist yet)
      const { error: insertError } = await supabase
        .from('artists')
        .insert({
          id: artistId,
          name: `Artist ${artistId}`, // Placeholder name
          stored_tracks: tracksForStorage,
          updated_at: new Date().toISOString()
        });
      
      if (insertError) {
        console.error(`Error creating artist ${artistId}:`, insertError);
      } else {
        console.log(`Created new artist ${artistId} with ${tracks.length} tracks`);
      }
      
      return;
    }
    
    console.log(`Stored ${tracks.length} tracks in database for artist ${artistId}`);
  } catch (error) {
    console.error(`Error saving tracks for artist ${artistId}:`, error);
  }
};
