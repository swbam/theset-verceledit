
import React from 'react';
import { Music, AlertCircle, Users, Info, Clock, Trophy } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import ShareSetlistButton from '@/components/setlist/ShareSetlistButton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import ShowSetlist from './ShowSetlist';

interface Song {
  id: string;
  name: string;
  votes: number;
  userVoted: boolean;
}

interface Track {
  id: string;
  name: string;
}

interface SetlistSectionProps {
  setlist: Song[];
  isConnected: boolean;
  isLoadingTracks: boolean;
  handleVote: (songId: string) => void;
  showId?: string;
  showName?: string;
  artistName?: string;
  availableTracks?: Track[];
  isLoadingAllTracks?: boolean;
  selectedTrack?: string;
  setSelectedTrack?: (trackId: string) => void;
  handleAddSong?: () => void;
}

const SetlistSection: React.FC<SetlistSectionProps> = ({ 
  setlist, 
  isConnected, 
  isLoadingTracks, 
  handleVote,
  showId = '',
  showName = 'Concert',
  artistName = 'Artist',
  availableTracks = [],
  isLoadingAllTracks = false,
  selectedTrack = '',
  setSelectedTrack = () => {},
  handleAddSong = () => {}
}) => {
  const { isAuthenticated, login } = useAuth();
  
  // Calculate total votes
  const totalVotes = setlist.reduce((acc, song) => acc + song.votes, 0);
  const userVotedCount = setlist.filter(song => song.userVoted).length;
  
  return (
    <section className="px-6 md:px-8 lg:px-12 py-12 bg-gradient-to-b from-[#0A0A16] to-[#10101E]">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <Card className="bg-[#0A0A16] border-white/10 shadow-lg overflow-hidden">
              <CardHeader className="pb-4 border-b border-white/10">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div>
                    <CardTitle className="text-2xl font-bold flex items-center gap-2 text-white">
                      <Music className="h-5 w-5 text-white/70" />
                      Setlist Voting
                      <span className="inline-flex items-center ml-2 text-xs bg-white/10 text-white/90 px-2 py-0.5 rounded-full">
                        Live
                      </span>
                    </CardTitle>
                    <CardDescription className="mt-1.5 text-white/70">
                      Vote for songs you want to hear at this show
                    </CardDescription>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-3">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="text-xs bg-white/10 text-white px-3 py-1.5 rounded-full font-medium flex items-center gap-1.5">
                            <Users size={14} />
                            <span>{totalVotes} {totalVotes === 1 ? 'vote' : 'votes'}</span>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent className="bg-[#0A0A16] border-white/10 text-white">
                          <p>Total votes across all songs</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    
                    {isAuthenticated && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="text-xs bg-white/10 text-white px-3 py-1.5 rounded-full font-medium flex items-center gap-1.5">
                              <span>{userVotedCount}</span>
                              <span>songs voted</span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent className="bg-[#0A0A16] border-white/10 text-white">
                            <p>You've voted for {userVotedCount} songs</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                    
                    {isConnected ? (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="text-xs bg-green-500/10 text-green-400 px-3 py-1.5 rounded-full font-medium flex items-center gap-1.5">
                              <span className="inline-block w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                              <span>Live updates</span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent className="bg-[#0A0A16] border-white/10 text-white">
                            <p>You're seeing votes in real time</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    ) : (
                      <div className="text-xs bg-yellow-500/10 text-yellow-400 px-3 py-1.5 rounded-full font-medium flex items-center gap-1.5">
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
                    <div className="h-8 bg-white/5 rounded w-full max-w-md"></div>
                    <div className="h-8 bg-white/5 rounded w-full max-w-lg"></div>
                    <div className="h-8 bg-white/5 rounded w-full max-w-sm"></div>
                    <div className="h-8 bg-white/5 rounded w-full max-w-lg"></div>
                  </div>
                ) : (
                  <>
                    <ShowSetlist 
                      setlist={setlist}
                      handleVote={handleVote}
                      availableTracks={availableTracks}
                      isLoadingAllTracks={isLoadingAllTracks}
                      selectedTrack={selectedTrack}
                      setSelectedTrack={setSelectedTrack}
                      handleAddSong={handleAddSong}
                      isAuthenticated={isAuthenticated}
                      login={login}
                    />
                    
                    {!isAuthenticated && (
                      <div className="p-4 mx-4 mb-4 mt-2">
                        <Alert variant="default" className="bg-white/5 border-white/10">
                          <AlertCircle className="h-4 w-4 text-white/70" />
                          <AlertDescription className="flex items-center justify-between">
                            <span className="text-white/80">Log in with Spotify to vote for songs</span>
                            <Button 
                              size="sm" 
                              onClick={login}
                              className="bg-white text-[#0A0A16] hover:bg-white/90"
                            >
                              Log In
                            </Button>
                          </AlertDescription>
                        </Alert>
                      </div>
                    )}
                    
                    <div className="p-5 border-t border-white/10 text-sm text-white/60 flex justify-between items-center">
                      <div className="flex items-center gap-1.5">
                        <span className="inline-block w-2 h-2 bg-green-500 rounded-full"></span>
                        <p>
                          Last updated {formatDistanceToNow(new Date(), { addSuffix: true })}
                        </p>
                      </div>
                      
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <Info className="h-4 w-4 text-white/40" />
                          </TooltipTrigger>
                          <TooltipContent side="top" className="bg-[#0A0A16] border-white/10 text-white">
                            <p>Votes are updated in real time</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
          
          <div className="space-y-6">
            <Card className="bg-[#0A0A16] border-white/10 shadow-lg">
              <CardHeader>
                <CardTitle className="text-xl font-bold flex items-center gap-2 text-white">
                  <Trophy className="h-5 w-5 text-white/70" />
                  Voting Stats
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-white/70 mb-1">Total Votes</p>
                  <div className="text-2xl font-bold text-white">{totalVotes}</div>
                  <div className="w-full h-2 bg-white/10 rounded-full mt-1">
                    <div className="h-full bg-white/30 rounded-full" style={{ width: `${Math.min(100, totalVotes / 10)}%` }}></div>
                  </div>
                </div>
                
                {isAuthenticated && (
                  <div>
                    <p className="text-sm text-white/70 mb-1">Your Votes</p>
                    <div className="text-2xl font-bold text-white">{userVotedCount}</div>
                    <div className="w-full h-2 bg-white/10 rounded-full mt-1">
                      <div className="h-full bg-white/30 rounded-full" style={{ width: `${Math.min(100, (userVotedCount / 10) * 100)}%` }}></div>
                    </div>
                  </div>
                )}
                
                <div>
                  <p className="text-sm text-white/70 mb-1">Voting Closes In</p>
                  <div className="text-xl font-bold text-white">2d 14h</div>
                </div>
                
                <div className="pt-2 mt-2 border-t border-white/10">
                  <div className="flex items-center gap-2">
                    <Users size={16} className="text-white/70" />
                    <p className="text-sm text-white/70"><span className="font-bold text-white">127</span> fans have voted</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-[#0A0A16] border-white/10 shadow-lg">
              <CardHeader>
                <CardTitle className="text-xl font-bold flex items-center gap-2 text-white">
                  <Info className="h-5 w-5 text-white/70" />
                  How It Works
                </CardTitle>
              </CardHeader>
              <CardContent className="text-white/70 text-sm space-y-4">
                <p>
                  Vote for songs you want to hear at this show. The most voted songs rise to the top of the list.
                </p>
                <p>
                  Artists and promoters can see these votes to help plan setlists. You can vote for multiple songs,
                  but only once per song.
                </p>
                <div className="flex items-center gap-2 text-white/50 mt-2 pt-2 border-t border-white/10">
                  <Clock size={14} />
                  <p className="text-xs">Voting closes 2 hours before the show</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
};

export default SetlistSection;
