
import React from 'react';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import Hero from '@/components/home/Hero';
import FeaturedArtists from '@/components/home/FeaturedArtists';
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import SetlistTable from '@/components/setlist/SetlistTable';

// Mock data for demo setlist
const mockSetlist = [
  { id: 'song1', name: 'Anti-Hero', votes: 256, userVoted: false },
  { id: 'song2', name: 'Cruel Summer', votes: 214, userVoted: true },
  { id: 'song3', name: 'Blank Space', votes: 189, userVoted: false },
  { id: 'song4', name: 'Lover', votes: 167, userVoted: false },
  { id: 'song5', name: 'All Too Well', votes: 152, userVoted: false },
];

// Mock data for upcoming shows
const upcomingShows = [
  {
    id: 'show1',
    name: 'The Eras Tour',
    date: '2023-08-25T20:00:00',
    image_url: 'https://static01.nyt.com/images/2023/04/16/multimedia/16eras-intro-fzhm/16eras-intro-fzhm-mobileMasterAt3x.jpg',
    venue: {
      name: 'SoFi Stadium',
      city: 'Los Angeles',
      state: 'CA'
    },
    artist: {
      name: 'Taylor Swift'
    }
  },
  {
    id: 'show2',
    name: 'After Hours Tour',
    date: '2023-09-10T19:30:00',
    image_url: 'https://www.nme.com/wp-content/uploads/2022/01/the-weeknd-2000x1270-1.jpg',
    venue: {
      name: 'Madison Square Garden',
      city: 'New York',
      state: 'NY'
    },
    artist: {
      name: 'The Weeknd'
    }
  }
];

const Index = () => {
  const handleVote = (songId: string) => {
    console.log(`Voted for song: ${songId}`);
    // In a real app, this would call an API to register the vote
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <main className="flex-grow">
        {/* Hero section */}
        <Hero />
        
        {/* Featured artists section */}
        <FeaturedArtists />
        
        {/* How it works section */}
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
        
        {/* Upcoming shows section */}
        <section className="py-20 px-6 md:px-8 lg:px-12 bg-secondary/50">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between mb-12">
              <div>
                <span className="block text-sm font-medium text-muted-foreground mb-2">Upcoming</span>
                <h2 className="text-3xl md:text-4xl font-bold">Featured Shows</h2>
                <p className="text-muted-foreground mt-2 max-w-xl">Vote on setlists for these upcoming concerts and help shape the perfect show.</p>
              </div>
              
              <Link 
                to="/shows" 
                className="mt-4 md:mt-0 group inline-flex items-center text-foreground hover:text-primary transition-colors"
              >
                View all shows
                <ArrowRight size={16} className="ml-1 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {upcomingShows.map((show, index) => (
                <div 
                  key={show.id} 
                  className="animate-fade-in" 
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <Link 
                    to={`/shows/${show.id}`} 
                    className="block rounded-xl overflow-hidden border border-border bg-card hover-scale transition-all"
                  >
                    <div className="relative aspect-[21/9] overflow-hidden">
                      <img 
                        src={show.image_url} 
                        alt={show.name} 
                        className="object-cover w-full h-full"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                      <div className="absolute bottom-0 left-0 p-6">
                        <h3 className="text-white text-2xl font-bold">{show.name}</h3>
                        <p className="text-white/90 mt-2">{show.artist.name}</p>
                      </div>
                    </div>
                    
                    <div className="p-6 flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="bg-primary/10 w-12 h-12 rounded-full flex items-center justify-center text-primary">
                          <span className="font-mono font-medium">
                            {new Date(show.date).getDate()}
                          </span>
                        </div>
                        <div className="ml-4">
                          <p className="text-sm font-medium">
                            {new Date(show.date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {show.venue.city}, {show.venue.state}
                          </p>
                        </div>
                      </div>
                      
                      <div>
                        <span className="inline-block text-sm font-medium px-3 py-1 bg-primary/10 rounded-full text-primary">
                          Vote Now
                        </span>
                      </div>
                    </div>
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
      
      <Footer />
    </div>
  );
};

export default Index;
