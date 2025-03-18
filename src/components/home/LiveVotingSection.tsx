import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowUpIcon } from 'lucide-react';
import { fetchMostActiveVotingShow } from '@/lib/api/db/setlist-utils';

const LiveVotingNow = () => {
  const { data: activeVoting, isLoading } = useQuery({
    queryKey: ['activeVoting'],
    queryFn: fetchMostActiveVotingShow,
  });

  const formatCount = (count: number) => {
    return new Intl.NumberFormat().format(count);
  };

  return (
    <section className="py-12 px-4 bg-black">
      <div className="container mx-auto max-w-7xl">
        <div className="flex flex-col md:flex-row gap-8">
          <div className="w-full md:w-1/2 lg:w-7/12">
            <h2 className="text-2xl font-bold mb-2">Live Voting Now</h2>
            <p className="text-white/60 text-sm mb-5">
              Check out the most active setlist voting right now and help your votes count for your favorite songs.
            </p>
            
            {isLoading ? (
              <div className="aspect-[16/9] bg-zinc-900 rounded-lg animate-pulse"></div>
            ) : activeVoting ? (
              <div className="relative bg-zinc-900 rounded-lg overflow-hidden">
                <div className="aspect-[16/9] relative overflow-hidden">
                  {activeVoting.image_url ? (
                    <img 
                      src={activeVoting.image_url} 
                      alt={activeVoting.artist?.name} 
                      className="w-full h-full object-cover opacity-60"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-zinc-900 to-zinc-800"></div>
                  )}
                  
                  <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/90 to-transparent">
                    <div className="inline-flex items-center bg-white/10 backdrop-blur-sm text-xs px-2 py-1 rounded-full mb-2">
                      <span className="w-2 h-2 bg-red-500 rounded-full mr-1.5 animate-pulse"></span>
                      Live
                    </div>
                    <h3 className="text-xl font-bold">{activeVoting.artist?.name || 'Unknown Artist'}</h3>
                    <p className="text-white/80 text-sm">{activeVoting.name}</p>
                  </div>
                </div>
                
                <div className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-sm text-white/70">
                      {new Date(activeVoting.date).toLocaleDateString('en-US', { 
                        month: 'long', 
                        day: 'numeric', 
                        year: 'numeric' 
                      })}
                    </div>
                    <div className="text-sm font-medium">
                      {formatCount(activeVoting.votes_count || 0)} total votes
                    </div>
                  </div>
                  
                  <Button asChild className="w-full">
                    <Link to={`/shows/${activeVoting.id}`}>View Full Setlist</Link>
                  </Button>
                </div>
              </div>
            ) : (
              <div className="aspect-[16/9] bg-zinc-900 rounded-lg flex items-center justify-center text-white/40">
                No active voting shows right now
              </div>
            )}
          </div>
          
          <div className="w-full md:w-1/2 lg:w-5/12">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-lg font-medium">Most Voted Songs</h3>
              {activeVoting && (
                <Link to={`/shows/${activeVoting.id}`} className="text-sm text-white/70 hover:text-white">
                  View all songs
                </Link>
              )}
            </div>
            
            {isLoading ? (
              <div className="space-y-3">
                {Array(5).fill(0).map((_, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-zinc-900 rounded animate-pulse">
                    <div className="flex items-center gap-3">
                      <div className="w-5 text-center text-white/40">{i+1}</div>
                      <div className="h-4 w-40 bg-zinc-800 rounded"></div>
                    </div>
                    <div className="h-4 w-16 bg-zinc-800 rounded"></div>
                  </div>
                ))}
              </div>
            ) : activeVoting?.top_songs?.length > 0 ? (
              <div className="space-y-1">
                {activeVoting.top_songs.map((song, index) => (
                  <div key={song.id} className="flex items-center justify-between p-3 bg-zinc-900 rounded group hover:bg-zinc-800">
                    <div className="flex items-center gap-3">
                      <div className="w-5 text-center text-white/40">{index+1}</div>
                      <div className="font-medium">{song.name}</div>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-white/70">{formatCount(song.votes)}</span>
                      <button 
                        className="opacity-0 group-hover:opacity-100 p-1 rounded-full hover:bg-white/10 transition-opacity"
                        onClick={() => window.location.href = `/shows/${activeVoting.id}`}
                      >
                        <ArrowUpIcon className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-zinc-900 p-10 rounded text-center text-white/40">
                No voting data available
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default LiveVotingNow;
