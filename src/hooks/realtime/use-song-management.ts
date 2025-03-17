
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
      if (!setlistId) {
        console.error("Missing setlist ID");
        
        // Try to get or create the setlist again
        const id = await getSetlistId(showId);
        if (!id) {
          toast.error("Unable to add song: setlist not found");
          return;
        }
        
        toast.info("Setlist reconnected, please try adding the song again");
        return;
      }
      
      if (!trackId) {
        console.error("Missing track ID");
        toast.error("Please select a song first");
        return;
      }
      
      console.log(`Adding song ${trackId} (${trackName}) to setlist ${setlistId}`);
      
      // Check if song already exists in setlist
      const songExists = setlist.some(song => song.id === trackId);
      
      if (songExists) {
        console.log(`Song ${trackId} already exists in setlist`);
        toast.info(`"${trackName}" is already in the setlist!`);
        return;
      }
      
      const songId = await dbAddSongToSetlist(setlistId, trackId, trackName);
      
      if (songId) {
        console.log("Song added successfully with ID:", songId);
        // Refresh the songs list
        refetchSongs();
      } else {
        console.error("Failed to add song");
        toast.error("Failed to add song to setlist");
      }
    } catch (error) {
      console.error("Error adding song:", error);
      toast.error("Error adding song to setlist");
    }
  }, [setlistId, showId, getSetlistId, setlist, refetchSongs]);
  
  // Add initial songs to the database
  const addInitialSongs = useCallback(async (setlistId: string, initialSongs: any[]) => {
    if (!setlistId || !initialSongs || initialSongs.length === 0) return;
    
    console.log("Adding initial songs:", initialSongs.length);
    
    // Add each song to the setlist
    for (const song of initialSongs) {
      if (!song.id.startsWith('placeholder')) {
        console.log(`Adding initial song to setlist: ${song.name}`);
        await dbAddSongToSetlist(setlistId, song.id, song.name);
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
