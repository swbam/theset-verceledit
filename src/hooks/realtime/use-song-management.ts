
import { useCallback } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { addSongToSetlist as dbAddSongToSetlist } from '@/lib/api/db/setlist-utils';

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
  
  // Add initial songs to the database
  const addInitialSongs = useCallback(async (setlistId: string, initialSongs: any[]) => {
    if (!setlistId || !initialSongs || initialSongs.length === 0) return;
    
    console.log("Adding initial songs:", initialSongs.length);
    
    // Add each song to the setlist
    for (const song of initialSongs) {
      try {
        console.log(`Adding initial song to setlist: ${song.name} (${song.id})`);
        await dbAddSongToSetlist(setlistId, song.id, song.name);
      } catch (err) {
        console.error(`Error adding initial song ${song.id}:`, err);
      }
    }
    
    // Refresh the songs list
    refetchSongs();
  }, [refetchSongs]);
  
  return {
    handleAddSong,
    addInitialSongs
  };
}
