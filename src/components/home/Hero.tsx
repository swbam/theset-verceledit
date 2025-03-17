
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

  const handlePopularSearch = (query: string) => {
    navigate(`/search?q=${encodeURIComponent(query)}`);
  };

  // Popular search terms from the design
  const popularSearches = [
    { name: "Taylor Swift", path: "Taylor Swift" },
    { name: "Coldplay", path: "Coldplay" },
    { name: "Bad Bunny", path: "Bad Bunny" },
    { name: "New York", path: "New York" }
  ];

  return (
    <section className="relative bg-black text-white py-16 md:py-20">
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
              className="pl-10 py-6 h-12 bg-black/40 border-white/10 text-white placeholder:text-white/60 rounded-md w-full focus-visible:ring-white/30"
            />
          </div>
        </form>

        <div className="flex flex-wrap justify-center gap-2 mt-4">
          {popularSearches.map((search) => (
            <Button
              key={search.name}
              variant="outline"
              size="sm"
              className="bg-black/40 hover:bg-black/60 border border-white/20 text-white rounded-full px-4 py-1"
              onClick={() => handlePopularSearch(search.path)}
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
