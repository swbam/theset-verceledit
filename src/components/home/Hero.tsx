import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/auth/AuthContext';

const Hero = () => {
  const navigate = useNavigate();
  const { isAuthenticated, loginWithSpotify } = useAuth();
  
  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const searchQuery = (e.target as any).elements.searchQuery.value;
    if (searchQuery) {
      navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
    }
  };
  
  return (
    <section className="relative bg-black overflow-hidden py-16 md:py-24">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 tracking-tight text-center">
            Vote on the setlists<br />you want to hear
          </h1>
          
          <p className="text-lg md:text-xl text-white/80 mb-8 text-center">
            Discover upcoming concerts and help shape the perfect shows by voting for your favorite songs.
          </p>
          
          <form onSubmit={handleSearch} className="relative mb-6">
            <div className="relative mx-auto max-w-xl">
              <input
                type="text"
                name="searchQuery"
                placeholder="Search for artists, venues, or cities..."
                className="w-full bg-white/10 border border-white/20 rounded-full px-5 py-3.5 pl-12 text-white placeholder:text-white/60 focus:outline-none focus:ring-2 focus:ring-white/20"
              />
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-white/60" />
              </div>
            </div>
          </form>
          
          <div className="flex flex-wrap justify-center gap-2 mb-12">
            <Button 
              variant="outline" 
              className="rounded-full bg-white/10 hover:bg-white/20 border-white/10 text-white"
              onClick={() => navigate('/search?q=Taylor+Swift')}
            >
              Taylor Swift
            </Button>
            <Button 
              variant="outline" 
              className="rounded-full bg-white/10 hover:bg-white/20 border-white/10 text-white"
              onClick={() => navigate('/search?q=Coldplay')}
            >
              Coldplay
            </Button>
            <Button 
              variant="outline" 
              className="rounded-full bg-white/10 hover:bg-white/20 border-white/10 text-white"
              onClick={() => navigate('/search?q=Bad+Bunny')}
            >
              Bad Bunny
            </Button>
            <Button 
              variant="outline" 
              className="rounded-full bg-white/10 hover:bg-white/20 border-white/10 text-white"
              onClick={() => navigate('/search?q=Hip+Hop')}
            >
              Hip Hop
            </Button>
            <Button 
              variant="outline" 
              className="rounded-full bg-white/10 hover:bg-white/20 border-white/10 text-white"
              onClick={() => navigate('/search?q=Electronic')}
            >
              Electronic
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
