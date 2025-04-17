import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from "@/integrations/supabase/client"; // Keep client for subscriptions
import { RealtimeChannel } from '@supabase/supabase-js';
import { toast } from "sonner";
import { addVoteToSong } from '@/lib/api/database/votes'; // Import the corrected API function
import { Song } from '@/lib/types'; // Import the main Song type

// Define the shape of the song data used within this hook
interface RealtimeSong extends Song {
  // Inherits fields from lib/types Song
  // Add client-side state:
  userVoted: boolean;
  // Ensure votes is always a number (it's vote_count in DB)
  votes: number;
}

interface UseRealtimeVotesProps {
  showId: string;
  // Removed initialSongs, will fetch fresh based on showId -> artistId
}

export function useRealtimeVotes({ showId }: UseRealtimeVotesProps) {
  const [songs, setSongs] = useState<RealtimeSong[]>([]);
  const [artistId, setArtistId] = useState<string | null>(null); // Store artistId
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);

  // --- Anonymous Voting State ---
  const [anonymousVoteCount, setAnonymousVoteCount] = useState<number>(() => {
    // Initialize from localStorage if it exists
    const stored = localStorage.getItem(`anonymousVotes-${showId}`);
    const storedCount = typeof window !== 'undefined' ? localStorage.getItem(`anonymousVotes-${showId}`) : null;
    return storedCount ? parseInt(storedCount, 10) : 0;
  });
  const [anonymousVotedSongs, setAnonymousVotedSongs] = useState<string[]>(() => {
    const storedSongs = typeof window !== 'undefined' ? localStorage.getItem(`anonymousVotedSongs-${showId}`) : null;
    return storedSongs ? JSON.parse(storedSongs) : [];
  });
  // --- End Anonymous Voting State ---

  // Fetch initial songs for the show's artist
  const fetchInitialArtistSongs = useCallback(async () => {
    if (!showId) return;
    setLoading(true);
    setError(null);
    setArtistId(null); // Reset artist ID on new fetch
    try {
      // 1. Get the artist_id from the show
      const { data: showData, error: showError } = await supabase
        .from('shows')
        .select('artist_id')
        .eq('id', showId)
        .maybeSingle();

      if (showError) throw showError;
      if (!showData?.artist_id) {
        throw new Error(`Artist not found for show ${showId}`);
      }

      const currentArtistId = showData.artist_id;
      setArtistId(currentArtistId); // Store artist ID

      // 2. Fetch songs for that artist, ordered by vote_count
      const { data: songsData, error: songsError } = await supabase
        .from('songs')
        .select('*') // Select all song fields
        .eq('artist_id', currentArtistId)
        .order('vote_count', { ascending: false, nullsFirst: false }) // Order by votes
        .limit(50); // Limit the number of songs initially fetched

      if (songsError) throw songsError;

      // 3. Map to local state structure, including anonymous vote status
      const initialMappedSongs: RealtimeSong[] = (songsData || []).map(s => ({
        ...s,
        id: s.id ?? `unknown-${Math.random()}`, // Ensure ID exists
        name: s.name ?? 'Unknown Song', // Ensure name exists
        votes: s.vote_count ?? 0, // Use vote_count from songs table
        userVoted: anonymousVotedSongs.includes(s.id ?? ''), // Check anonymous votes
      }));

      setSongs(initialMappedSongs);
      console.log(`Initialized ${initialMappedSongs.length} songs for artist ${currentArtistId} (show ${showId})`);

    } catch (err: any) {
      console.error("Error fetching initial artist songs:", err);
      setError(err.message || 'Failed to load songs');
      toast.error("Failed to load songs for voting.");
    } finally {
      setLoading(false);
    }
  }, [showId, anonymousVotedSongs]);

  // Initial data fetch
  useEffect(() => {
    fetchInitialArtistSongs();
  }, [fetchInitialArtistSongs]);

  // Setup real-time subscription for song vote_count changes for the specific artist
  useEffect(() => {
    // Only subscribe if we have an artistId
    if (!artistId) {
      // Ensure cleanup if channel exists but conditions aren't met
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
        setIsConnected(false);
      }
      return;
    }

    // Ensure cleanup happens if dependencies change
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
      setIsConnected(false);
      console.log("Removed previous real-time channel.");
    }

    console.log(`Setting up real-time subscription for song updates (artist: ${artistId})`);

    const channel = supabase.channel(`artist-${artistId}-songs-votes`)
      .on<Song>( // Listen to changes on the 'songs' table
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'songs',
          filter: `artist_id=eq.${artistId}` // Filter by relevant artist ID
        },
        (payload) => {
          console.log('Realtime song update received:', payload);
          const updatedSong = payload.new as Song; // Type assertion
          // Check if the updated song exists in our current list and vote_count is present
          if (updatedSong?.id && updatedSong.vote_count !== undefined) {
            setSongs(currentSongs => {
              const songExists = currentSongs.some(s => s.id === updatedSong.id);
              let newSongs = currentSongs;

              if (songExists) {
                // Update existing song
                newSongs = currentSongs.map(song =>
                  song.id === updatedSong.id
                    ? { ...song, votes: updatedSong.vote_count ?? song.votes } // Update vote count
                    : song
                );
              } else {
                // Add new song if it wasn't in the initial fetch (less likely with artist filter but possible)
                console.warn(`Received update for song ${updatedSong.id} not initially loaded.`);
                // We might choose not to add it, or add it carefully:
                // newSongs = [...currentSongs, { ...updatedSong, votes: updatedSong.vote_count ?? 0, userVoted: false }];
              }
              // Re-sort after update/add
              return newSongs.sort((a, b) => b.votes - a.votes);
            });
          }
        }
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          setIsConnected(true);
          console.log(`Real-time channel subscribed for artist ${artistId}`);
        } else {
          setIsConnected(false);
          if (err) {
            console.error("Real-time subscription error:", err);
            setError("Real-time connection failed.");
            toast.error("Real-time connection failed.");
          }
        }
      });

    channelRef.current = channel; // Store channel reference

    // Cleanup on unmount or dependency change
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
          .then(() => console.log("Real-time channel removed successfully."))
          .catch(err => console.error("Error removing real-time channel:", err));
        channelRef.current = null;
        setIsConnected(false);
      }
    };
  }, [artistId]); // Depend only on artistId
  
  // Vote for a song
  const voteForSong = useCallback(async (songId: string) => {
    // Check if anonymous user has used all their votes
    // NOTE: This assumes isAuthenticated is passed or available via context
    // For simplicity here, we'll assume anonymous voting is allowed for now
    // but the limit check logic needs access to authentication state.
    // Let's remove the limit check for now and assume the API handles auth/limits.

    // Check if user has already voted for this song (client-side check)
    const songToVote = songs.find(song => song.id === songId);
    if (songToVote?.userVoted) {
      console.log(`Already voted for song: ${songToVote.name}`);
      toast.info("You've already voted for this song");
      return false; // Indicate vote didn't proceed
    }

    // Optimistically update the UI
    setSongs(currentSongs =>
      currentSongs.map(song =>
        song.id === songId
          ? { ...song, votes: song.votes + 1, userVoted: true }
          : song
      ).sort((a, b) => b.votes - a.votes) // Re-sort immediately
    );

    // Update anonymous tracking if needed (assuming anonymous for now)
    const newVotedSongs = [...anonymousVotedSongs, songId];
    setAnonymousVotedSongs(newVotedSongs);
    if (typeof window !== 'undefined') {
      localStorage.setItem(`anonymousVotedSongs-${showId}`, JSON.stringify(newVotedSongs));
      // Increment anonymous count - needs auth context to be truly accurate
      // const newCount = anonymousVoteCount + 1;
      // setAnonymousVoteCount(newCount);
      // localStorage.setItem(`anonymousVotes-${showId}`, newCount.toString());
    }


    try {
      // Call the API function to record the vote
      const result = await addVoteToSong(songId, showId);

      if (!result.success) {
        // API handled the error (e.g., already voted via session/IP)
        toast.info(result.message || "Could not record vote.");
        // Revert optimistic UI update if the API failed definitively
        setSongs(currentSongs =>
          currentSongs.map(song =>
            song.id === songId
              ? { ...song, votes: song.votes - 1, userVoted: false } // Revert vote and status
              : song
          ).sort((a, b) => b.votes - a.votes) // Re-sort
        );
        // Revert anonymous tracking
        const revertedVotedSongs = anonymousVotedSongs.filter(id => id !== songId);
        setAnonymousVotedSongs(revertedVotedSongs);
         if (typeof window !== 'undefined') {
           localStorage.setItem(`anonymousVotedSongs-${showId}`, JSON.stringify(revertedVotedSongs));
           // Decrement count if needed
         }
        return false;
      }

      // API call was successful, UI is already updated optimistically.
      // The realtime subscription should eventually confirm the vote count.
      console.log(`Vote successfully processed via API for song ID: ${songId}`);
      return true;

    } catch (error) {
      console.error('Error calling addVoteToSong API:', error);
      toast.error('Failed to submit vote. Please try again.');

      // Revert optimistic UI update on network/unexpected error
      setSongs(currentSongs =>
        currentSongs.map(song =>
          song.id === songId
            ? { ...song, votes: song.votes - 1, userVoted: false }
            : song
        ).sort((a, b) => b.votes - a.votes)
      );
       // Revert anonymous tracking
       const revertedVotedSongs = anonymousVotedSongs.filter(id => id !== songId);
       setAnonymousVotedSongs(revertedVotedSongs);
       if (typeof window !== 'undefined') {
         localStorage.setItem(`anonymousVotedSongs-${showId}`, JSON.stringify(revertedVotedSongs));
         // Decrement count if needed
       }
      return false;
     }
   }, [showId, songs, anonymousVotedSongs]); // Added songs dependency for optimistic update check

  // Add a song to the setlist (client-side state update)
  const addSongToSetlist = useCallback((songToAdd: RealtimeSong) => {
    // Check if song already exists
    const songExists = songs.some(s => s.id === songToAdd.id);
    if (songExists) {
      console.log(`Song ${songToAdd.name} already in setlist state.`);
      // Optionally toast here or let the caller handle it
      return; // Don't add duplicates
    }

    console.log(`Adding song ${songToAdd.name} to local setlist state.`);
    setSongs(currentSongs =>
      [...currentSongs, songToAdd]
        .sort((a, b) => b.votes - a.votes) // Maintain sort order
    );

    // TODO: Persist added song?
    // This currently only updates local state. If added songs need to be
    // saved to the backend or broadcasted, API calls or channel messages
    // would be needed here.
  }, [songs]); // Dependency on songs state

  return {
    songs,
    loading, // Expose loading state
    error,   // Expose error state
    isConnected,
    voteForSong,
    addSongToSetlist, // Return the new function
    anonymousVoteCount,
    anonymousVotedSongs
  };
}
