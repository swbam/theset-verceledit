
import { useCallback } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { addSongToSetlist as dbAddSongToSetlist } from '@/lib/api/db/setlist-utils';
import { addTracksToSetlist } from '@/lib/api/db/setlist-utils';
import { Song } from './types';

/**
 * Hook for managing song additions to setlists
 */
export function useSongManagement(
  setlistId: string | null, 
  showId: string, 
  getSetlistId: (showId: string) => Promise<string | null>,
  refetchSongs: () => void,
  setlist: Song[]
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
      
      // Try to add the song, with detailed logging for debugging
      console.log("Calling dbAddSongToSetlist with params:", { 
        setlistId, trackId, trackName 
      });
      
      const songId = await dbAddSongToSetlist(setlistId, trackId, trackName);
      
      if (songId) {
        console.log("Song added successfully with ID:", songId);
        // Refresh the songs list
        refetchSongs();
        toast.success(`"${trackName}" added to setlist!`);
        return true;
      } else {
        console.error("Failed to add song - dbAddSongToSetlist returned null or undefined");
        toast.error("Failed to add song to setlist");
        
        // Try a direct database insertion as a fallback
        try {
          console.log("Attempting direct database insertion as fallback");
          const { data, error } = await supabase
            .from('setlist_songs')
            .insert({
              setlist_id: setlistId,
              track_id: trackId,
              votes: 0
            })
            .select('id')
            .single();
            
          if (error) {
            console.error("Error in direct insertion fallback:", error);
            return false;
          }
          
          if (data?.id) {
            console.log("Song added successfully via fallback with ID:", data.id);
            refetchSongs();
            toast.success(`"${trackName}" added to setlist!`);
            return true;
          }
        } catch (fallbackError) {
          console.error("Fallback insertion error:", fallbackError);
        }
        
        return false;
      }
    } catch (error: unknown) {
      console.error("Error adding song:", error);
      toast.error("Error adding song to setlist");
      return false;
    }
  }, [setlistId, showId, getSetlistId, setlist, refetchSongs]);
  
  // Add initial songs to the database all at once
  const addInitialSongs = useCallback(async (setlistId: string, initialSongs: Song[]) => {
    if (!setlistId) {
      console.error("Cannot add initial songs: missing setlist ID");
      return false;
    }
    
    if (!initialSongs || initialSongs.length === 0) {
      console.error("Cannot add initial songs: no songs provided");
      return false;
    }
    
    console.log(`Adding ${initialSongs.length} initial songs to setlist ${setlistId}`);
    
    try {
      // First check if the setlist already has songs
      const { data: existingSongs, error: checkError } = await supabase
        .from('setlist_songs')
        .select('id')
        .eq('setlist_id', setlistId)
        .limit(1);
      
      if (checkError) {
        console.error("Error checking for existing songs:", checkError);
      } else if (existingSongs && existingSongs.length > 0) {
        console.log("Setlist already has songs, skipping initial song addition");
        return true; // Already has songs, no need to add more
      }
      
      // If we don't have enough songs, select a random subset of 5
      let songsToAdd = initialSongs;
      if (initialSongs.length > 5) {
        console.log(`Selecting 5 random songs from ${initialSongs.length} available tracks`);
        // Shuffle the array and take the first 5
        const shuffled = [...initialSongs].sort(() => 0.5 - Math.random());
        songsToAdd = shuffled.slice(0, 5);
        console.log(`Selected songs: ${songsToAdd.map(s => s.name).join(', ')}`);
      }
      
      // Prepare the tracks for batch insertion
      const trackIds = songsToAdd.map(song => song.id);
      const trackNames = songsToAdd.reduce((acc, song) => {
        acc[song.id] = song.name;
        return acc;
      }, {} as Record<string, string>);
      
      // Insert all tracks at once using the bulk add function
      try {
        // This is more efficient than adding them one by one
        await addTracksToSetlist(setlistId, trackIds, trackNames);
        
        // Refresh the songs list
        setTimeout(() => {
          refetchSongs();
        }, 500); // Small delay to ensure database operations complete
        
        console.log(`Successfully added ${songsToAdd.length} initial songs to setlist`);
        return true;
      } catch (batchError: unknown) {
        console.error("Error in batch adding songs:", batchError);
        throw batchError; // Propagate to fallback
      }
    } catch (error: unknown) {
      console.error("Error adding initial songs:", error);
      // Try adding songs one by one as a fallback
      try {
        console.log("Attempting to add songs individually as fallback");
        let addedCount = 0;
        
        // Try to add at least 5 songs, or all available if less than 5
        const songsToTry = initialSongs.length > 5 
          ? initialSongs.slice(0, 5) 
          : initialSongs;
        
        for (const song of songsToTry) {
          try {
            const result = await dbAddSongToSetlist(setlistId, song.id, song.name);
            if (result) {
              addedCount++;
              console.log(`Added song: ${song.name}`);
            }
          } catch (singleSongError: unknown) {
            console.error(`Error adding song ${song.name}:`, singleSongError);
            // Continue with next song
          }
        }
        
        console.log(`Added ${addedCount}/${songsToTry.length} songs individually`);
        
        // Refresh the songs list if we added any songs
        if (addedCount > 0) {
          setTimeout(() => {
            refetchSongs();
          }, 500);
          return true;
        }
        
        return false;
      } catch (fallbackError: unknown) {
        console.error("Fallback error adding songs individually:", fallbackError);
        return false;
      }
    }
  }, [refetchSongs]);
  
  return {
    handleAddSong,
    addInitialSongs
  };
}
