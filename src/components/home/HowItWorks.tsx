
import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import SetlistTable from '@/components/setlist/SetlistTable';

// Mock data for demo setlist
const mockSetlist = [
  { id: 'song1', name: 'Anti-Hero', votes: 256, userVoted: false },
  { id: 'song2', name: 'Cruel Summer', votes: 214, userVoted: true },
  { id: 'song3', name: 'Blank Space', votes: 189, userVoted: false },
  { id: 'song4', name: 'Lover', votes: 167, userVoted: false },
  { id: 'song5', name: 'All Too Well', votes: 152, userVoted: false },
];

const HowItWorks = () => {
  const handleVote = (songId: string) => {
    console.log(`Voted for song: ${songId}`);
    // In a real app, this would call an API to register the vote
  };

  return (
    <section className="py-20 px-6 md:px-8 lg:px-12">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
        <div>
          <span className="inline-block text-sm font-medium text-muted-foreground mb-3">How it works</span>
          <h2 className="text-3xl md:text-4xl font-bold mb-6">Shape the Perfect Concert Experience</h2>
          
          <div className="space-y-8 mt-8">
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-medium">1</div>
              <div>
                <h3 className="text-xl font-medium mb-2">Find Your Artist</h3>
                <p className="text-muted-foreground">Search for your favorite artists and discover their upcoming concerts.</p>
              </div>
            </div>
            
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-medium">2</div>
              <div>
                <h3 className="text-xl font-medium mb-2">Vote on Songs</h3>
                <p className="text-muted-foreground">Cast your votes on songs you want to hear at the show.</p>
              </div>
            </div>
            
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-medium">3</div>
              <div>
                <h3 className="text-xl font-medium mb-2">Experience the Magic</h3>
                <p className="text-muted-foreground">Attend concerts with setlists shaped by fan preferences.</p>
              </div>
            </div>
          </div>
          
          <div className="mt-10">
            <Link
              to="/shows"
              className="group inline-flex items-center text-foreground hover:text-primary transition-colors"
            >
              View upcoming shows
              <ArrowRight size={16} className="ml-1 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </div>
        
        <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
          <div className="p-6 border-b border-border">
            <div className="flex items-start">
              <div>
                <h3 className="text-xl font-semibold">Taylor Swift: The Eras Tour</h3>
                <p className="text-sm text-muted-foreground mt-1">SoFi Stadium, Los Angeles</p>
              </div>
            </div>
          </div>
          
          <SetlistTable 
            songs={mockSetlist} 
            onVote={handleVote}
            className="animate-fade-in"
          />
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
