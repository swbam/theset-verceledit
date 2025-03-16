
import React from 'react';
import { Music } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import VotableSetlistTable from '@/components/setlist/VotableSetlistTable';

interface Song {
  id: string;
  name: string;
  votes: number;
  userVoted: boolean;
}

interface SetlistSectionProps {
  setlist: Song[];
  isConnected: boolean;
  isLoadingTracks: boolean;
  handleVote: (songId: string) => void;
}

const SetlistSection: React.FC<SetlistSectionProps> = ({ 
  setlist, 
  isConnected, 
  isLoadingTracks, 
  handleVote 
}) => {
  return (
    <section className="px-6 md:px-8 lg:px-12 py-12">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between mb-8">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold">Setlist Voting</h2>
            <p className="text-muted-foreground mt-1">Vote for songs you want to hear at this show</p>
          </div>
          
          <div className="flex items-center mt-4 md:mt-0">
            {isConnected && (
              <span className="text-xs bg-green-500/10 text-green-500 px-2 py-1 rounded-full flex items-center">
                <span className="inline-block w-2 h-2 bg-green-500 rounded-full mr-1"></span>
                Live updates
              </span>
            )}
            <p className="text-sm text-muted-foreground ml-3">
              Last updated {formatDistanceToNow(new Date(), { addSuffix: true })}
            </p>
          </div>
        </div>
        
        {isLoadingTracks ? (
          <div className="animate-pulse space-y-4 border border-border rounded-xl p-6">
            <div className="h-8 bg-secondary rounded w-full max-w-md"></div>
            <div className="h-8 bg-secondary rounded w-full max-w-lg"></div>
            <div className="h-8 bg-secondary rounded w-full max-w-sm"></div>
            <div className="h-8 bg-secondary rounded w-full max-w-lg"></div>
          </div>
        ) : setlist.length === 0 ? (
          <div className="text-center p-12 border border-border rounded-xl">
            <Music className="mx-auto mb-4 text-muted-foreground h-10 w-10" />
            <h3 className="text-xl font-medium mb-2">No setlist available</h3>
            <p className="text-muted-foreground">
              Check back later for setlist information
            </p>
          </div>
        ) : (
          <div className="border border-border rounded-xl overflow-hidden">
            <VotableSetlistTable 
              songs={setlist} 
              onVote={handleVote} 
              className="animate-fade-in"
            />
          </div>
        )}
        
        <div className="mt-8 p-4 bg-secondary/30 rounded-lg text-sm text-muted-foreground">
          <p>
            <strong>How voting works:</strong> Vote for songs you want to hear at this show. 
            Artists and promoters can see these votes to help plan setlists. You can only vote for each song once.
          </p>
        </div>
      </div>
    </section>
  );
};

export default SetlistSection;
