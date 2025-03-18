import React, { useState, useEffect } from 'react';
import { ChevronUp, Music, AlertTriangle } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { subscribeToSongVotes } from '@/lib/realtime';
import { voteForSong } from '@/lib/api/votes';

interface SetlistSong {
  id: string;
  title: string;
  album?: string;
  spotify_url?: string;
  vote_count: number;
  user_has_voted?: boolean;
}

interface SetlistVoteTableProps {
  setlistId: string;
  songs: SetlistSong[];
  isLoading?: boolean;
  error?: Error | null;
  userId?: string | null;
  onVoteSuccess?: (songId: string) => void;
}

const SetlistVoteTable = ({
  setlistId,
  songs,
  isLoading = false,
  error = null,
  userId = null,
  onVoteSuccess
}: SetlistVoteTableProps) => {
  // Track local vote counts and voted status for optimistic UI updates
  const [localSongs, setLocalSongs] = useState<SetlistSong[]>([]);
  
  // Initialize local state when songs change
  useEffect(() => {
    if (songs && songs.length > 0) {
      setLocalSongs([...songs].sort((a, b) => b.vote_count - a.vote_count));
    }
  }, [songs]);
  
  // Vote for a song
  const handleVote = async (songId: string) => {
    if (!userId) {
      toast.error("Please log in to vote", {
        description: "You need to be logged in with Spotify to vote on setlists",
        action: {
          label: "Login",
          onClick: () => window.location.href = "/login"
        }
      });
      return;
    }
    
    // Check if user already voted for this song
    const hasVoted = localSongs.find(song => song.id === songId)?.user_has_voted;
    if (hasVoted) {
      toast.info("You've already voted for this song", {
        id: `already-voted-${songId}`,
      });
      return;
    }
    
    // Optimistic UI update
    setLocalSongs(prev => 
      prev.map(song => {
        if (song.id === songId) {
          return {
            ...song,
            vote_count: song.vote_count + 1,
            user_has_voted: true
          };
        }
        return song;
      }).sort((a, b) => b.vote_count - a.vote_count)
    );
    
    try {
      // Submit vote to server
      await voteForSong(songId, userId);
      
      if (onVoteSuccess) {
        onVoteSuccess(songId);
      }
      
      toast.success("Vote recorded!", {
        id: `vote-success-${songId}`,
        duration: 2000
      });
    } catch (error) {
      console.error("Error voting for song:", error);
      
      // Revert optimistic update
      setLocalSongs(prev => 
        prev.map(song => {
          if (song.id === songId) {
            return {
              ...song,
              vote_count: song.vote_count - 1,
              user_has_voted: false
            };
          }
          return song;
        }).sort((a, b) => b.vote_count - a.vote_count)
      );
      
      toast.error("Failed to record your vote", {
        description: "Please try again in a moment",
      });
    }
  };
  
  // Subscribe to real-time updates for each song
  useEffect(() => {
    if (!songs || songs.length === 0) return;
    
    // Create a cleanup function array
    const cleanupFunctions = songs.map(song => {
      return subscribeToSongVotes(song.id, (newCount) => {
        setLocalSongs(prev => 
          prev.map(s => {
            if (s.id === song.id) {
              return {
                ...s,
                vote_count: newCount
              };
            }
            return s;
          }).sort((a, b) => b.vote_count - a.vote_count)
        );
      });
    });
    
    // Cleanup subscriptions on unmount
    return () => {
      cleanupFunctions.forEach(cleanup => cleanup());
    };
  }, [songs]);
  
  if (error) {
    return (
      <div className="border border-red-800/30 bg-red-900/10 rounded-lg p-6 text-center">
        <AlertTriangle className="h-8 w-8 text-red-400 mx-auto mb-2" />
        <h3 className="text-lg font-medium text-white mb-2">Failed to load setlist</h3>
        <p className="text-zinc-400 mb-4">We couldn't load the setlist data. Please try again.</p>
        <Button variant="outline" onClick={() => window.location.reload()}>
          Refresh Page
        </Button>
      </div>
    );
  }
  
  if (isLoading) {
    return (
      <div className="rounded-md border border-zinc-800 overflow-hidden">
        <div className="bg-zinc-900/50 px-4 py-3 border-b border-zinc-800">
          <Skeleton className="h-6 w-32" />
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">
                <Skeleton className="h-4 w-4" />
              </TableHead>
              <TableHead>
                <Skeleton className="h-4 w-20" />
              </TableHead>
              <TableHead className="text-right w-[100px]">
                <Skeleton className="h-4 w-16 ml-auto" />
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <TableRow key={i}>
                <TableCell>
                  <Skeleton className="h-8 w-8 rounded-full" />
                </TableCell>
                <TableCell>
                  <div className="space-y-1">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <Skeleton className="h-9 w-16 rounded-md ml-auto" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }
  
  if (localSongs.length === 0) {
    return (
      <div className="border border-zinc-800 bg-zinc-900/50 rounded-lg p-6 text-center">
        <Music className="h-8 w-8 text-zinc-500 mx-auto mb-2" />
        <h3 className="text-lg font-medium text-white mb-1">No songs in this setlist yet</h3>
        <p className="text-zinc-400">Songs will appear here once they're added to the setlist.</p>
      </div>
    );
  }
  
  return (
    <div className="rounded-md border border-zinc-800 overflow-hidden">
      <div className="bg-zinc-900/50 px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
        <h3 className="font-medium">Setlist Vote Rankings</h3>
        <span className="text-xs text-zinc-500">
          {userId ? 'Vote for songs you want to hear!' : 'Log in to vote'}
        </span>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[50px]">#</TableHead>
            <TableHead>Song</TableHead>
            <TableHead className="text-right w-[100px]">Votes</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {localSongs.map((song, index) => (
            <TableRow key={song.id} className="group">
              <TableCell className="font-mono text-zinc-500">{index + 1}</TableCell>
              <TableCell>
                <div className="font-medium">{song.title}</div>
                {song.album && (
                  <div className="text-xs text-zinc-500">{song.album}</div>
                )}
              </TableCell>
              <TableCell className="text-right">
                <Button
                  variant={song.user_has_voted ? "secondary" : "outline"}
                  size="sm"
                  onClick={() => handleVote(song.id)}
                  className={`transition-all ${song.user_has_voted ? 'bg-green-900/30 hover:bg-green-900/50 text-green-400 border-green-700/50' : ''}`}
                  disabled={song.user_has_voted && !userId}
                  aria-label={song.user_has_voted ? "You voted for this song" : "Vote for this song"}
                >
                  <ChevronUp className={`h-4 w-4 mr-1.5 ${song.user_has_voted ? 'text-green-400' : ''}`} />
                  <span>{song.vote_count}</span>
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default SetlistVoteTable; 