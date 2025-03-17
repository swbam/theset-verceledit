
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/auth';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

const LiveVotingSection = () => {
  const { isAuthenticated, user } = useAuth();

  // Placeholder for a live voting query - in reality, you would fetch active setlists
  const { data: activeVoting } = useQuery({
    queryKey: ['liveVoting'],
    queryFn: async () => {
      // Placeholder data - would be replaced with real API call
      return {
        artist: 'Taylor Swift',
        show: 'The Eras Tour',
        date: 'May 15, 2023',
        location: 'MetLife Stadium',
        attendees: 98732,
        image: 'https://media.pitchfork.com/photos/61d4ca4cef233215262a2e2b/master/w_1600,c_limit/taylor-swift-bb13-2021-billboard-1548.jpg'
      };
    },
    enabled: isAuthenticated,
  });

  if (!isAuthenticated) {
    return (
      <div className="bg-black border border-white/10 rounded-lg p-6">
        <h2 className="text-2xl font-bold mb-3">Live Voting Now</h2>
        <p className="text-white/70 mb-4">
          Sign in to see live voting and participate in the experience.
        </p>
        <Button asChild variant="outline">
          <Link to="/auth">Sign In</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="bg-black border border-white/10 rounded-lg">
      <div className="p-6">
        <h2 className="text-2xl font-bold mb-2">Live Voting Now</h2>
        <p className="text-white/70 mb-4">
          Check out the most active setlist voting right now and add your voice by voting for your favorite songs.
        </p>
      </div>

      {activeVoting ? (
        <div className="relative">
          <div className="h-64 overflow-hidden">
            <img 
              src={activeVoting.image} 
              alt={activeVoting.artist} 
              className="w-full h-full object-cover opacity-50"
            />
            <div className="absolute inset-0 bg-black/50"></div>
          </div>
          
          <div className="absolute bottom-0 left-0 p-4">
            <div className="mb-2">
              <h3 className="font-bold text-lg">{activeVoting.artist}</h3>
              <p className="text-sm text-white/70">{activeVoting.show}</p>
            </div>
            <div className="flex items-center text-xs text-white/60 mb-3">
              <span>{activeVoting.date}</span>
              <span className="mx-2">•</span>
              <span>{activeVoting.location}</span>
              <span className="mx-2">•</span>
              <span>{activeVoting.attendees.toLocaleString()} listeners</span>
            </div>
            <Button size="sm" variant="outline" className="bg-white text-black hover:bg-white/90">
              View Full Setlist
            </Button>
          </div>
        </div>
      ) : (
        <div className="h-64 flex items-center justify-center bg-black/20">
          <p className="text-white/50">No active voting sessions found</p>
        </div>
      )}
    </div>
  );
};

export default LiveVotingSection;
