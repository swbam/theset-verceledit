import React, { useState } from 'react';
import { ArrowBigUp } from 'lucide-react';
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
                    <span className={cn(
                      "font-medium text-white truncate max-w-[180px] sm:max-w-[250px] md:max-w-full",
                    )}>
                      {song.name}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="py-4 px-4 text-center hidden sm:table-cell">
                  <span className={cn(
                    "inline-flex items-center justify-center min-w-10 text-center font-medium text-sm",
                    animatingSongId === song.id && "scale-105 transition-transform"
                  )}>
                    {song.votes}
                  </span>
                </TableCell>
                <TableCell className="py-4 px-4 text-right">
                  <div className="flex items-center justify-end gap-3">
                    <span className="text-sm font-medium sm:hidden text-white">
                      {song.votes}
                    </span>
                    <button
                      onClick={() => !song.userVoted && handleVote(song.id)}
                      disabled={song.userVoted}
                      className={cn(
                        "inline-flex items-center justify-center rounded-full w-8 h-8 transition-all",
                        song.userVoted 
                          ? "bg-white/90 text-black cursor-default" 
                          : "text-white border border-white/20 hover:bg-white/10",
                        animatingSongId === song.id && "scale-105"
                      )}
                      title={song.userVoted ? "You already voted for this song" : "Vote for this song"}
                      aria-label={song.userVoted ? "You already voted for this song" : "Vote for this song"}
                    >
                      <ArrowBigUp className={cn(
                        "h-4 w-4 transition-all",
                        song.userVoted && "text-black",
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
        <div className="flex justify-end p-3 text-xs text-white">
          <div className="flex items-center gap-1.5">
            <span>You've used {anonymousVoteCount}/3 free votes</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default VotableSetlistTable;
