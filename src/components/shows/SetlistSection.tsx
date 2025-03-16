
import React from 'react';
import { Music, AlertCircle, Users, Info } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import VotableSetlistTable from '@/components/setlist/VotableSetlistTable';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import ShareSetlistButton from '@/components/setlist/ShareSetlistButton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

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
  showId?: string;
  showName?: string;
  artistName?: string;
}

const SetlistSection: React.FC<SetlistSectionProps> = ({ 
  setlist, 
  isConnected, 
  isLoadingTracks, 
  handleVote,
  showId = '',
  showName = 'Concert',
  artistName = 'Artist'
}) => {
  const { isAuthenticated, login } = useAuth();
  
  // Calculate total votes
  const totalVotes = setlist.reduce((acc, song) => acc + song.votes, 0);
  const userVotedCount = setlist.filter(song => song.userVoted).length;
  
  return (
    <section className="px-6 md:px-8 lg:px-12 py-12 bg-secondary/20">
      <div className="max-w-5xl mx-auto">
        <Card className="bg-card shadow-md border-border/50">
          <CardHeader className="pb-4 border-b border-border/60">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <CardTitle className="text-2xl font-bold flex items-center gap-2">
                  <Music className="h-5 w-5 text-primary" />
                  Setlist Voting
                </CardTitle>
                <CardDescription className="mt-1.5">
                  Vote for songs you want to hear at this show
                </CardDescription>
              </div>
              
              <div className="flex flex-wrap items-center gap-3">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="text-xs bg-primary/10 text-primary px-3 py-1.5 rounded-full font-medium flex items-center gap-1.5">
                        <Users size={14} />
                        <span>{totalVotes} {totalVotes === 1 ? 'vote' : 'votes'}</span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Total votes across all songs</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                
                {isAuthenticated && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="text-xs bg-amber-500/10 text-amber-600 dark:text-amber-400 px-3 py-1.5 rounded-full font-medium flex items-center gap-1.5">
                          <span>{userVotedCount}</span>
                          <span>songs voted</span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>You've voted for {userVotedCount} songs</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
                
                {isConnected ? (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="text-xs bg-green-500/10 text-green-600 dark:text-green-400 px-3 py-1.5 rounded-full font-medium flex items-center gap-1.5">
                          <span className="inline-block w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                          <span>Live updates</span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>You're seeing votes in real time</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ) : (
                  <div className="text-xs bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 px-3 py-1.5 rounded-full font-medium flex items-center gap-1.5">
                    <span className="inline-block w-2 h-2 bg-yellow-500 rounded-full"></span>
                    <span>Offline mode</span>
                  </div>
                )}
                
                <ShareSetlistButton 
                  showId={showId}
                  showName={showName}
                  artistName={artistName}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoadingTracks ? (
              <div className="p-12 space-y-8 animate-pulse">
                <div className="h-8 bg-secondary rounded w-full max-w-md"></div>
                <div className="h-8 bg-secondary rounded w-full max-w-lg"></div>
                <div className="h-8 bg-secondary rounded w-full max-w-sm"></div>
                <div className="h-8 bg-secondary rounded w-full max-w-lg"></div>
              </div>
            ) : setlist.length === 0 ? (
              <div className="text-center p-12">
                <Music className="mx-auto mb-4 text-muted-foreground h-12 w-12 opacity-20" />
                <h3 className="text-xl font-medium mb-2">No setlist available</h3>
                <p className="text-muted-foreground">
                  Check back later for setlist information
                </p>
              </div>
            ) : (
              <>
                <VotableSetlistTable 
                  songs={setlist} 
                  onVote={handleVote} 
                  className="animate-fade-in"
                />
                
                {!isAuthenticated && (
                  <div className="p-4 mx-4 mb-4 mt-2">
                    <Alert variant="default" className="bg-primary/5 border-primary/20">
                      <AlertCircle className="h-4 w-4 text-primary" />
                      <AlertDescription className="flex items-center justify-between">
                        <span>Log in with Spotify to vote for songs</span>
                        <Button 
                          size="sm" 
                          onClick={login}
                          className="bg-primary text-primary-foreground hover:bg-primary/90"
                        >
                          Log In
                        </Button>
                      </AlertDescription>
                    </Alert>
                  </div>
                )}
                
                <div className="p-5 border-t border-border/60 text-sm text-muted-foreground flex justify-between items-center">
                  <div className="flex items-center gap-1.5">
                    <span className="inline-block w-2 h-2 bg-green-500 rounded-full"></span>
                    <p>
                      Last updated {formatDistanceToNow(new Date(), { addSuffix: true })}
                    </p>
                  </div>
                  
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="h-4 w-4 text-muted-foreground/60" />
                      </TooltipTrigger>
                      <TooltipContent side="top">
                        <p>Votes are updated in real time</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </>
            )}
          </CardContent>
        </Card>
        
        <div className="mt-8 rounded-lg bg-card/80 border border-border/50 p-5 text-sm text-muted-foreground">
          <h4 className="font-medium text-primary mb-2">How Setlist Voting Works</h4>
          <p>
            Vote for songs you want to hear at this show. The most voted songs rise to the top of the list.
            Artists and promoters can see these votes to help plan setlists. You can vote for multiple songs,
            but only once per song.
          </p>
        </div>
      </div>
    </section>
  );
};

export default SetlistSection;
