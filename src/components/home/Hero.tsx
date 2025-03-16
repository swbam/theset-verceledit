
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const Hero = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  return (
    <section className="relative bg-primary text-primary-foreground overflow-hidden">
      <div className="absolute inset-0 bg-[url('/placeholder.svg')] opacity-10"></div>
      <div className="container relative z-10 py-20 md:py-32">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
            Vote on the setlists you want to hear
          </h1>
          <p className="text-xl md:text-2xl mb-10 opacity-90">
            Discover upcoming concerts and help shape the perfect show
          </p>

          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3 max-w-xl mx-auto mb-8">
            <div className="relative flex-grow">
              <Input
                type="text"
                placeholder="Search for artists with upcoming shows..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-12 pl-4 pr-10 bg-white/20 border-white/30 text-white placeholder:text-white/60 focus-visible:ring-white"
              />
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60" size={20} />
            </div>
            <Button 
              type="submit" 
              size="lg" 
              className="bg-white text-primary hover:bg-white/90"
            >
              Search
            </Button>
          </form>

          <Button 
            variant="link" 
            className="text-white group"
            onClick={() => navigate('/shows')}
          >
            Browse all upcoming shows
            <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Button>
        </div>
      </div>
    </section>
  );
};

export default Hero;
