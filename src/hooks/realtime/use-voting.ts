import { useState, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Song } from './types';

/**
 * Helper function to vote for a song
 */
async function voteForSong(setlistId: string, songId: string, userId: string): Promise<boolean> {
  try {
    console.log(`Voting for song ${songId} in setlist ${setlistId} by user ${userId}`);
    
    // Check if the user has already voted for this song
    const { data: existingVote, error: checkError } = await supabase
      .from('votes')
      .select('id')
      .eq('setlist_song_id', songId)
      .eq('user_id', userId)
      .maybeSingle();
    
    if (checkError && checkError.code !== 'PGRST116') {
      console.error("Error checking for existing vote:", checkError);
      return false;
    }
    
    if (existingVote) {
      console.log("User has already voted for this song");
      toast.info("You've already voted for this song!");
      return false;
    }
    
    // Add the vote to the votes table
    const { error: voteError } = await supabase
      .from('votes')
      .insert({
        setlist_song_id: songId,
        user_id: userId
      });
    
    if (voteError) {
      console.error("Error adding vote:", voteError);
      return false;
    }
    
    // Increment the votes count in the setlist_songs table
    const { error: updateError } = await supabase
      .rpc('increment_votes', { song_id: songId });
    
    if (updateError) {
      console.error("Error incrementing votes:", updateError);
      
      // Fallback: manually update the votes count
      const { data: song, error: fetchError } = await supabase
        .from('setlist_songs')
        .select('votes')
        .eq('id', songId)
        .single();
      
      if (fetchError) {
        console.error("Error fetching song votes:", fetchError);
        return false;
      }
      
      const newVoteCount = (typeof song.votes === 'number' ? song.votes : 0) + 1;
      
      const { error: manualUpdateError } = await supabase
        .from('setlist_songs')
        .update({ votes: newVoteCount })
        .eq('id', songId);
      
      if (manualUpdateError) {
        console.error("Error manually updating votes:", manualUpdateError);
        return false;
      }
    }
    
    console.log(`Successfully voted for song ${songId}`);
    return true;
  } catch (error) {
    console.error("Error in voteForSong:", error);
    return false;
  }
}

/**
 * Hook for handling voting functionality
 */
export function useVoting(
  setlistId: string | null, 
  songs: Song[], 
  userId: string | undefined, 
  showId: string,
  isAuthenticated: boolean,
  incrementAnonymousVote: () => number,
  hasReachedVoteLimit: boolean
) {
  const queryClient = useQueryClient();
  
  // Vote mutation
  const { mutate: voteMutation, isPending: isVoting } = useMutation({
    mutationFn: async (songId: string) => {
      try {
        console.log("Voting for song:", songId);
        
        if (!setlistId) {
          console.error("No setlist ID available, can't vote");
          return false;
        }
        
        // Find the song to get its setlistSongId
        const song = songs?.find(s => s.id === songId);
        
        if (!song || !song.setlistSongId) {
          console.error("Song not found in database or missing setlistSongId:", songId);
          return false;
        }
        
        if (!isAuthenticated) {
          // For anonymous voting, just track count locally
          console.log("Anonymous vote for song:", songId);
          
          // Check if we've reached the limit for anonymous votes
          if (hasReachedVoteLimit) {
            toast.error("You've reached the maximum number of anonymous votes. Log in to vote more!");
            return false;
          }
          
          // Increment anonymous vote count
          incrementAnonymousVote();
          
          // Optimistically update the UI (will be handled by the parent component)
          return true;
        } else {
          // Logged-in user vote
          console.log("Authenticated vote for song:", songId, "with setlistSongId:", song.setlistSongId);
          
          // Call the vote function with the setlistSongId
          return await voteForSong(setlistId, song.setlistSongId, userId!);
        }
      } catch (error) {
        console.error("Error voting for song:", error);
        return false;
      }
    },
    onSuccess: (success, songId) => {
      if (success) {
        console.log("Vote recorded successfully for song:", songId);
        // Invalidate queries to refresh data
        queryClient.invalidateQueries({ queryKey: ['setlistSongs', showId, setlistId] });
      }
    },
    onError: (error, songId) => {
      console.error(`Error voting for song ${songId}:`, error);
      toast.error("Error recording vote. Please try again.");
    }
  });
  
  const vote = async (songId: string) => {
    return new Promise<boolean>((resolve) => {
      voteMutation(songId, {
        onSuccess: (success) => resolve(success),
        onError: () => resolve(false)
      });
    });
  };
  
  return {
    vote,
    isVoting
  };
}
