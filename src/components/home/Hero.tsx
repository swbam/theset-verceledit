import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Music, CalendarDays, ThumbsUp } from 'lucide-react';
import { Button } from '@/components/ui/button';

const Hero = () => {
  const navigate = useNavigate();
  
  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const searchQuery = (e.target as any).elements.searchQuery.value;
    if (searchQuery) {
      navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
    }
  };
  
  return (
    <section className="relative overflow-hidden pt-20 pb-24 md:pt-24 md:pb-32 bg-black">
      {/* Background pattern */}
      <div className="absolute inset-0 z-0 opacity-20">
        <div className="absolute top-0 left-0 right-0 h-px bg-white/10"></div>
        <div className="absolute inset-0 bg-[url('/images/grid-pattern.svg')] bg-repeat opacity-10"></div>
      </div>
      
      <div className="container relative z-10 mx-auto px-4 max-w-5xl">
        <div className="text-center mb-12">
          <div className="inline-block px-6 py-2 mb-6 border border-zinc-800 rounded-full text-sm text-white/80">
            <span className="inline-block w-2 h-2 bg-white rounded-full mr-2"></span>
            <span>Currently 546 fans voting on upcoming shows</span>
          </div>
          
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold text-white mb-6 tracking-tight">
            <span>Vote on setlists</span><br />
            <span>for upcoming concerts</span>
          </h1>
          
          <p className="text-lg md:text-xl text-white/70 mb-10 max-w-2xl mx-auto leading-relaxed">
            Help shape the perfect show by voting for your favorite songs. Join thousands of fans influencing what artists play live.
          </p>
          
          <form onSubmit={handleSearch} className="relative mb-8 max-w-xl mx-auto">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white/50 h-5 w-5" />
              <input
                type="text"
                name="searchQuery"
                placeholder="Search for artists with upcoming shows..."
                className="w-full bg-zinc-900 border border-zinc-800 rounded-full px-5 py-4 pl-12 text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-white/30 transition-all shadow-lg"
              />
              <Button 
                type="submit" 
                className="absolute right-1.5 top-1/2 transform -translate-y-1/2 rounded-full bg-white text-black hover:bg-white/90 px-5 py-2 h-auto"
              >
                Search
              </Button>
            </div>
          </form>
          
          <div className="flex flex-wrap justify-center gap-3 mb-12">
            <Button 
              variant="outline" 
              className="rounded-full bg-zinc-900 hover:bg-zinc-800 border-zinc-800 text-white text-sm px-5 py-2 h-auto"
              onClick={() => navigate('/search?q=Taylor+Swift')}
            >
              Taylor Swift
            </Button>
            <Button 
              variant="outline" 
              className="rounded-full bg-zinc-900 hover:bg-zinc-800 border-zinc-800 text-white text-sm px-5 py-2 h-auto"
              onClick={() => navigate('/search?q=Coldplay')}
            >
              Coldplay
            </Button>
            <Button 
              variant="outline" 
              className="rounded-full bg-zinc-900 hover:bg-zinc-800 border-zinc-800 text-white text-sm px-5 py-2 h-auto"
              onClick={() => navigate('/search?q=Bad+Bunny')}
            >
              Bad Bunny
            </Button>
            <Button 
              variant="outline" 
              className="rounded-full bg-zinc-900 hover:bg-zinc-800 border-zinc-800 text-white text-sm px-5 py-2 h-auto"
              onClick={() => navigate('/search?q=Beyoncé')}
            >
              Beyoncé
            </Button>
            <Button 
              variant="outline" 
              className="rounded-full bg-zinc-900 hover:bg-zinc-800 border-zinc-800 text-white text-sm px-5 py-2 h-auto"
              onClick={() => navigate('/search?q=The+Weeknd')}
            >
              The Weeknd
            </Button>
          </div>
        </div>
        
        {/* Key benefits section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
          <div className="p-6 rounded-xl bg-zinc-900 border border-zinc-800">
            <div className="inline-flex items-center justify-center w-12 h-12 mb-4 rounded-full bg-zinc-800 text-white">
              <Music size={24} />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Find Your Shows</h3>
            <p className="text-white/70">Discover upcoming concerts for your favorite artists in your area</p>
          </div>
          
          <div className="p-6 rounded-xl bg-zinc-900 border border-zinc-800">
            <div className="inline-flex items-center justify-center w-12 h-12 mb-4 rounded-full bg-zinc-800 text-white">
              <ThumbsUp size={24} />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Vote on Songs</h3>
            <p className="text-white/70">Help shape the perfect concert by voting on which tracks should be played</p>
          </div>
          
          <div className="p-6 rounded-xl bg-zinc-900 border border-zinc-800">
            <div className="inline-flex items-center justify-center w-12 h-12 mb-4 rounded-full bg-zinc-800 text-white">
              <CalendarDays size={24} />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Share & Connect</h3>
            <p className="text-white/70">See what other fans want to hear and build the ultimate show experience</p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
