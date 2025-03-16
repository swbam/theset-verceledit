
import React from 'react';
import { ArrowBigUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

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
  // Sort songs by vote count (descending)
  const sortedSongs = [...songs].sort((a, b) => b.votes - a.votes);
  
  return (
    <div className={cn("w-full", className)}>
      <table className="w-full">
        <thead>
          <tr className="border-b border-border bg-secondary/30">
            <th className="py-3 px-4 text-left">#</th>
            <th className="py-3 px-4 text-left">Song</th>
            <th className="py-3 px-4 text-center">Votes</th>
            <th className="py-3 px-4 text-right">
              <span className="sr-only">Vote</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {sortedSongs.map((song, index) => (
            <tr 
              key={song.id} 
              className={cn(
                "border-b border-border",
                "hover:bg-secondary/30 transition-colors",
                index === sortedSongs.length - 1 && "border-b-0"
              )}
            >
              <td className="py-3 px-4 text-muted-foreground">{index + 1}</td>
              <td className="py-3 px-4 font-medium">{song.name}</td>
              <td className="py-3 px-4 text-center">
                <span className="inline-block min-w-10 text-center">
                  {song.votes}
                </span>
              </td>
              <td className="py-3 px-4 text-right">
                <Button
                  onClick={() => onVote(song.id)}
                  size="sm"
                  variant={song.userVoted ? "default" : "ghost"}
                  className={cn(
                    "min-w-10",
                    song.userVoted ? "cursor-default" : "hover:bg-secondary"
                  )}
                  disabled={song.userVoted}
                >
                  <ArrowBigUp className={cn(
                    "h-5 w-5",
                    song.userVoted ? "text-primary-foreground" : "text-muted-foreground"
                  )} />
                  <span className="sr-only">
                    {song.userVoted ? "Voted" : "Vote"}
                  </span>
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default VotableSetlistTable;
