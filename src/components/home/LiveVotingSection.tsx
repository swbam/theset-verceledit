import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/auth';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { ArrowUp } from 'lucide-react';

const LiveVotingSection = () => {
  const { isAuthenticated } = useAuth();

  // Mock data for the most voted songs
  const mostVotedSongs = [
    { id: 1, rank: 1, name: 'Cruel Summer', votes: 5474, tour: 'The Eras Tour' },
    { id: 2, rank: 2, name: 'Anti-Hero', votes: 4107, tour: 'The Eras Tour' },
    { id: 3, rank: 3, name: 'Blank Space', votes: 3088, tour: 'The Eras Tour' },
    { id: 4, rank: 4, name: 'August', votes: 2681, tour: 'The Eras Tour' },
    { id: 5, rank: 5, name: 'All Too Well (10 min)', votes: 1952, tour: 'The Eras Tour' }
  ];

  return (
    <section className="py-12 px-4 bg-black">
      <div className="container mx-auto max-w-7xl">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white">Live Voting Now</h2>
          <p className="text-sm text-white/60 mt-1">
            Check out the most active setlist voting right now and add your voice
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Featured artist/show with image */}
          <div className="relative rounded-lg overflow-hidden border border-white/10">
            <div className="aspect-[4/3] relative">
              <img 
                src="https://media.pitchfork.com/photos/61d4ca4cef233215262a2e2b/master/w_1600,c_limit/taylor-swift-bb13-2021-billboard-1548.jpg"
                alt="Taylor Swift" 
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent"></div>
            </div>
            
            <div className="absolute bottom-0 left-0 right-0 p-6">
              <div className="inline-block bg-black/30 backdrop-blur-sm px-3 py-1 rounded-full text-xs text-white/70 mb-2">
                NOW VOTING
              </div>
              <h3 className="text-2xl font-bold text-white mb-1">Taylor Swift</h3>
              <p className="text-white/70 mb-3">The Eras Tour</p>
              <div className="flex items-center text-xs text-white/60 space-x-3 mb-4">
                <span>Jun 21, 2023</span>
                <span>•</span>
                <span>MetLife Stadium, NJ</span>
                <span>•</span>
                <span>92,850 fans</span>
              </div>
              <Button asChild className="bg-white text-black hover:bg-white/90 rounded-full">
                <Link to="/shows/taylor-eras-tour">View Full Setlist</Link>
              </Button>
            </div>
          </div>
          
          {/* Most voted songs table */}
          <div className="border border-white/10 rounded-lg overflow-hidden">
            <div className="p-4 border-b border-white/10">
              <h3 className="font-bold">Most Voted Songs</h3>
              <p className="text-xs text-white/60">
                Songs for Taylor Swift's The Eras Tour
              </p>
            </div>
            
            <div className="divide-y divide-white/10">
              {mostVotedSongs.map((song) => (
                <div key={song.id} className="flex items-center p-4">
                  <div className="w-6 text-white/40 text-sm font-mono">
                    {song.rank}
                  </div>
                  <div className="flex-1 ml-3">
                    <h4 className="font-medium">{song.name}</h4>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-white/70 text-sm font-medium">
                      {song.votes.toLocaleString()}
                    </span>
                    <div className="w-8 h-8 rounded-full border border-white/20 flex items-center justify-center">
                      <ArrowUp className="h-4 w-4 text-white/70" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="p-4 border-t border-white/10 text-center">
              <Button asChild variant="ghost" className="text-sm text-white/70 hover:text-white">
                <Link to="/shows/taylor-eras-tour">View all songs</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default LiveVotingSection;
