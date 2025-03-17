
import React, { useState } from 'react';
import { ArrowBigUp, Music, Trophy, Star, Crown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow 
} from '@/components/ui/table';
import { useIsMobile } from '@/hooks/use-mobile';

interface Song {
  id: string;
  name: string;
  votes: number;
  userVoted: boolean;
}

interface VotableSetlistTableProps {
  songs: Song[];
  onVote: (songId: string) => void;
  className?: string;
  anonymousVoteCount?: number;
}

const VotableSetlistTable = ({ songs, onVote, className, anonymousVoteCount = 0 }: VotableSetlistTableProps) => {
  const [animatingSongId, setAnimatingSongId] = useState<string | null>(null);
  const isMobile = useIsMobile();
  
  const handleVote = (songId: string) => {
    setAnimatingSongId(songId);
    onVote(songId);
    
    // Remove animation class after animation completes
    setTimeout(() => {
      setAnimatingSongId(null);
    }, 1000);
  };
  
  // Sort songs by vote count (descending)
  const sortedSongs = [...songs].sort((a, b) => b.votes - a.votes);
  
  return (
    <div className={cn("w-full", className)}>
      <Table>
        <TableHeader>
          <TableRow className="border-b border-white/10">
            <TableHead className="py-3 px-4 text-left text-xs font-medium text-white/60 uppercase tracking-wider">Song</TableHead>
            <TableHead className="py-3 px-4 text-center text-xs font-medium text-white/60 uppercase tracking-wider hidden sm:table-cell">Votes</TableHead>
            <TableHead className="py-3 px-4 text-right text-xs font-medium text-white/60 uppercase tracking-wider">
              <span className="sr-only">Vote</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedSongs.length === 0 ? (
            <TableRow>
              <TableCell colSpan={3} className="py-16 text-center text-white/60">
                No songs in the setlist yet. Add some songs using the dropdown above.
              </TableCell>
            </TableRow>
          ) : (
            sortedSongs.map((song, index) => (
              <TableRow 
                key={song.id} 
                className={cn(
                  "transition-colors border-b border-white/10 group",
                  animatingSongId === song.id ? "bg-white/5" : "hover:bg-white/5",
                  song.userVoted && "bg-white/10 hover:bg-white/15",
                )}
              >
                <TableCell className="py-4 px-4">
                  <div className="flex items-center">
                    {/* Display rank icons only on mobile */}
                    {isMobile && index <= 2 && (
                      <>
                        {index === 0 && <Trophy size={16} className="mr-2 text-yellow-500" />}
                        {index === 1 && <Crown size={14} className="mr-2 text-gray-400" />}
                        {index === 2 && <Star size={14} className="mr-2 text-amber-700" />}
                      </>
                    )}
                    
                    {/* Always show music icon for non-top songs or on desktop */}
                    {(!isMobile || index > 2) && (
                      <Music size={16} className="mr-2 text-white/40" />
                    )}
                    
                    <span className={cn(
                      "font-medium truncate max-w-[180px] sm:max-w-[250px] md:max-w-full",
                      index === 0 && "text-yellow-500", 
                      index === 1 && "text-gray-400",
                      index === 2 && "text-amber-700",
                      song.userVoted && "text-white"
                    )}>
                      {song.name}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="py-4 px-4 text-center hidden sm:table-cell">
                  <span className={cn(
                    "inline-flex items-center justify-center min-w-10 text-center font-mono font-medium text-sm rounded-full py-0.5 px-2",
                    song.votes > 0 ? "bg-white/10 text-white" : "bg-white/5 text-white/60", 
                    animatingSongId === song.id && "animate-pulse"
                  )}>
                    {song.votes}
                  </span>
                </TableCell>
                <TableCell className="py-4 px-4 text-right">
                  <div className="flex items-center justify-end">
                    <span className="mr-2 text-sm font-medium sm:hidden text-white">
                      {song.votes}
                    </span>
                    <button
                      onClick={() => !song.userVoted && handleVote(song.id)}
                      disabled={song.userVoted}
                      className={cn(
                        "inline-flex items-center justify-center rounded-full w-9 h-9 transition-all",
                        song.userVoted 
                          ? "bg-white text-[#0A0A16] cursor-default" 
                          : "text-white/60 hover:bg-white/10 hover:text-white",
                        animatingSongId === song.id && "scale-110"
                      )}
                      title={song.userVoted ? "You already voted for this song" : "Vote for this song"}
                      aria-label={song.userVoted ? "You already voted for this song" : "Vote for this song"}
                    >
                      <ArrowBigUp className={cn(
                        "h-5 w-5 transition-all",
                        song.userVoted && "text-[#0A0A16]",
                        animatingSongId === song.id && "animate-bounce"
                      )} />
                      <span className="sr-only">
                        {song.userVoted ? "Voted" : "Vote"}
                      </span>
                    </button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
      
      {anonymousVoteCount > 0 && anonymousVoteCount < 3 && (
        <div className="flex justify-end p-3 text-xs text-amber-400">
          <div className="flex items-center gap-1.5">
            <span>You've used {anonymousVoteCount}/3 free votes</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default VotableSetlistTable;
