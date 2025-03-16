
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
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

  // Popular search terms from the design
  const popularSearches = [
    { name: "Taylor Swift", path: "/search?q=Taylor+Swift" },
    { name: "Coldplay", path: "/search?q=Coldplay" },
    { name: "Bad Bunny", path: "/search?q=Bad+Bunny" },
    { name: "New York", path: "/search?q=New+York" }
  ];

  return (
    <section className="relative bg-gradient-to-b from-black to-[#0A0A10] text-white py-16 md:py-20">
      <div className="container mx-auto px-4 md:px-6 max-w-5xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4">
            Vote on the setlists<br />
            you want to hear
          </h1>
          <p className="text-lg text-white/80 max-w-2xl mx-auto">
            Discover upcoming concerts and help shape the perfect
            show by voting for your favorite songs.
          </p>
        </div>

        <form onSubmit={handleSearch} className="max-w-xl mx-auto mb-8">
          <div className="relative">
            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-white/60" />
            </div>
            <Input
              type="text"
              placeholder="Search for artists, venues, or cities..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 py-6 h-12 bg-white/10 border-white/10 text-white placeholder:text-white/60 rounded-md w-full focus-visible:ring-white/30"
            />
          </div>
        </form>

        <div className="flex flex-wrap justify-center gap-2 mt-4">
          {popularSearches.map((search) => (
            <Button
              key={search.name}
              variant="secondary"
              size="sm"
              className="bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-full px-4 py-1"
              onClick={() => navigate(search.path)}
            >
              {search.name}
            </Button>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Hero;
