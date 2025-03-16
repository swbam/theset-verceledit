
import React, { useState } from 'react';
import { ArrowBigUp, Music } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

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
  const { isAuthenticated } = useAuth();
  const [animatingSongId, setAnimatingSongId] = useState<string | null>(null);
  
  // Sort songs by vote count (descending)
  const sortedSongs = [...songs].sort((a, b) => b.votes - a.votes);
  
  const handleVote = (songId: string) => {
    if (!isAuthenticated) {
      toast.error('Please log in to vote');
      return;
    }
    
    setAnimatingSongId(songId);
    onVote(songId);
    
    // Remove animation class after animation completes
    setTimeout(() => {
      setAnimatingSongId(null);
    }, 1000);
  };
  
  if (sortedSongs.length === 0) {
    return (
      <div className={cn("p-8 text-center", className)}>
        <Music className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
        <h3 className="text-lg font-medium mb-2">No songs in setlist yet</h3>
        <p className="text-muted-foreground">
          The setlist will be populated with the artist's top tracks soon.
        </p>
      </div>
    );
  }
  
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
                "transition-colors duration-300",
                animatingSongId === song.id && "bg-primary/5",
                "hover:bg-secondary/30",
                index === sortedSongs.length - 1 && "border-b-0"
              )}
            >
              <td className="py-3 px-4 text-muted-foreground">{index + 1}</td>
              <td className="py-3 px-4 font-medium">{song.name}</td>
              <td className="py-3 px-4 text-center">
                <span className={cn(
                  "inline-block min-w-10 text-center transition-all duration-300",
                  animatingSongId === song.id && "scale-125 text-primary font-medium"
                )}>
                  {song.votes}
                </span>
              </td>
              <td className="py-3 px-4 text-right">
                <Button
                  onClick={() => !song.userVoted && handleVote(song.id)}
                  size="sm"
                  variant={song.userVoted ? "default" : "outline"}
                  className={cn(
                    "min-w-10 transition-all duration-300",
                    song.userVoted 
                      ? "bg-primary hover:bg-primary cursor-default" 
                      : "hover:bg-primary/10 hover:text-primary hover:border-primary"
                  )}
                  disabled={song.userVoted}
                >
                  <ArrowBigUp className={cn(
                    "h-5 w-5 transition-transform",
                    song.userVoted 
                      ? "text-primary-foreground" 
                      : "text-muted-foreground group-hover:text-primary",
                    animatingSongId === song.id && "animate-bounce"
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
      
      {!isAuthenticated && (
        <div className="mt-4 p-3 border border-border bg-secondary/10 rounded-lg text-sm text-center">
          <p className="text-muted-foreground">
            <Button variant="link" className="p-0 h-auto" onClick={() => toast.info('Please log in at the top of the page')}>
              Log in with Spotify
            </Button> to vote on songs you want to hear at this show
          </p>
        </div>
      )}
    </div>
  );
};

export default VotableSetlistTable;
