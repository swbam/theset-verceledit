import { useCallback } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { addSongToSetlist as dbAddSongToSetlist } from '@/lib/api/db/setlist-utils';
import { addTracksToSetlist } from '@/lib/api/db/setlist-utils';

/**
 * Hook for managing song additions to setlists
 */
export function useSongManagement(
  setlistId: string | null, 
  showId: string, 
  getSetlistId: (showId: string) => Promise<string | null>,
  refetchSongs: () => void,
  setlist: any[]
) {
  // Handle adding a new song to the setlist
  const handleAddSong = useCallback(async (trackId: string, trackName: string) => {
    try {
      if (!trackId) {
        console.error("Missing track ID");
        toast.error("Please select a song first");
        return false;
      }
      
      if (!setlistId) {
        console.log("Setlist ID not available, attempting to get or create it");
        
        // Try to get or create the setlist
        const newSetlistId = await getSetlistId(showId);
        if (!newSetlistId) {
          toast.error("Unable to add song: could not create setlist");
          return false;
        }
        
        // We have a new setlist ID, but since this function will be called again 
        // after the setlistId state updates, we'll return here
        console.log(`Created/found setlist ID: ${newSetlistId}, will retry adding song`);
        toast.info("Preparing setlist, please try adding the song again");
        return false;
      }
      
      console.log(`Adding song ${trackId} (${trackName}) to setlist ${setlistId}`);
      
      // Check if song already exists in setlist
      const songExists = setlist.some(song => song.id === trackId);
      
      if (songExists) {
        console.log(`Song ${trackId} already exists in setlist`);
        toast.info(`"${trackName}" is already in the setlist!`);
        return false;
      }
      
      const songId = await dbAddSongToSetlist(setlistId, trackId, trackName);
      
      if (songId) {
        console.log("Song added successfully with ID:", songId);
        // Refresh the songs list
        refetchSongs();
        toast.success(`"${trackName}" added to setlist!`);
        return true;
      } else {
        console.error("Failed to add song");
        toast.error("Failed to add song to setlist");
        return false;
      }
    } catch (error) {
      console.error("Error adding song:", error);
      toast.error("Error adding song to setlist");
      return false;
    }
  }, [setlistId, showId, getSetlistId, setlist, refetchSongs]);
  
  // Add initial songs to the database all at once
  const addInitialSongs = useCallback(async (setlistId: string, initialSongs: any[]) => {
    if (!setlistId || !initialSongs || initialSongs.length === 0) return;
    
    console.log(`Adding ${initialSongs.length} initial songs to setlist ${setlistId}`);
    
    try {
      // Prepare the tracks for batch insertion
      const trackIds = initialSongs.map(song => song.id);
      const trackNames = initialSongs.reduce((acc, song) => {
        acc[song.id] = song.name;
        return acc;
      }, {});
      
      // Insert all tracks at once using the bulk add function
      // This is more efficient than adding them one by one
      await addTracksToSetlist(setlistId, trackIds, trackNames);
      
      // Refresh the songs list
      refetchSongs();
      
      console.log(`Successfully added ${initialSongs.length} initial songs to setlist`);
    } catch (error) {
      console.error("Error adding initial songs:", error);
      // Continue without initial songs if there's an error
    }
  }, [refetchSongs]);
  
  return {
    handleAddSong,
    addInitialSongs
  };
}
