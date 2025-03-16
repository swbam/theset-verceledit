
import React, { useState } from 'react';
import { ArrowBigUp, Music, Sparkles, Star } from 'lucide-react';
import { cn } from '@/lib/utils';

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
}

const VotableSetlistTable = ({ songs, onVote, className }: VotableSetlistTableProps) => {
  const [animatingSongId, setAnimatingSongId] = useState<string | null>(null);
  
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
      <table className="w-full">
        <thead>
          <tr className="border-b border-border/40">
            <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">#</th>
            <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Song</th>
            <th className="py-3 px-4 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider hidden sm:table-cell">Votes</th>
            <th className="py-3 px-4 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
              <span className="sr-only">Vote</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/20">
          {sortedSongs.map((song, index) => (
            <tr 
              key={song.id} 
              className={cn(
                "transition-colors group",
                animatingSongId === song.id ? "bg-primary/5" : "hover:bg-secondary/40",
                song.userVoted && "bg-primary/5 hover:bg-primary/10",
                index === 0 && "bg-amber-50/30 hover:bg-amber-50/40 dark:bg-amber-950/20 dark:hover:bg-amber-950/30",
                index === 1 && "bg-slate-50/30 hover:bg-slate-50/40 dark:bg-slate-950/10 dark:hover:bg-slate-950/20",
                index === 2 && "bg-zinc-50/30 hover:bg-zinc-50/40 dark:bg-zinc-950/5 dark:hover:bg-zinc-950/10"
              )}
            >
              <td className="py-4 px-4 w-12">
                {index === 0 ? (
                  <div className="flex items-center text-amber-500">
                    <Sparkles size={16} className="mr-1" />
                    <span className="font-medium">1</span>
                  </div>
                ) : index === 1 ? (
                  <div className="flex items-center text-slate-500">
                    <Star size={14} className="mr-1" />
                    <span className="font-medium">2</span>
                  </div>
                ) : (
                  <span className={cn(
                    "font-medium",
                    index === 2 && "text-zinc-500"
                  )}>
                    {index + 1}
                  </span>
                )}
              </td>
              <td className="py-4 px-4">
                <div className="flex items-center">
                  <Music size={16} className="mr-2 text-muted-foreground/60" />
                  <span className={cn(
                    "font-medium",
                    index === 0 && "text-amber-800 dark:text-amber-400", 
                    song.userVoted && "text-primary"
                  )}>
                    {song.name}
                  </span>
                </div>
              </td>
              <td className="py-4 px-4 text-center hidden sm:table-cell">
                <span className={cn(
                  "inline-flex items-center justify-center min-w-10 text-center font-mono font-medium text-sm rounded-full py-0.5 px-2",
                  song.votes > 0 ? "bg-primary/10 text-primary" : "bg-secondary/60 text-muted-foreground", 
                  animatingSongId === song.id && "animate-pulse"
                )}>
                  {song.votes}
                </span>
              </td>
              <td className="py-4 px-4 text-right">
                <div className="flex items-center justify-end">
                  <span className="mr-2 text-sm font-medium sm:hidden">
                    {song.votes}
                  </span>
                  <button
                    onClick={() => !song.userVoted && handleVote(song.id)}
                    disabled={song.userVoted}
                    className={cn(
                      "inline-flex items-center justify-center rounded-full w-9 h-9 transition-all",
                      song.userVoted 
                        ? "bg-primary text-primary-foreground cursor-default" 
                        : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                      animatingSongId === song.id && "scale-110"
                    )}
                    title={song.userVoted ? "You already voted for this song" : "Vote for this song"}
                  >
                    <ArrowBigUp className={cn(
                      "h-5 w-5 transition-all",
                      song.userVoted && "text-primary-foreground",
                      animatingSongId === song.id && "animate-bounce"
                    )} />
                    <span className="sr-only">
                      {song.userVoted ? "Voted" : "Vote"}
                    </span>
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default VotableSetlistTable;
