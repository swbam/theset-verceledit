
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { searchArtistsWithEvents } from '@/lib/api/artist';
import ArtistSearchResults from '@/components/artists/ArtistSearchResults';

const Hero = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const navigate = useNavigate();

  // Debounce search query
  useEffect(() => {
    const timerId = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);
    
    return () => {
      clearTimeout(timerId);
    };
  }, [searchQuery]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleArtistSelect = (artist: any) => {
    navigate(`/artists/${artist.id}`);
  };

  // Only query when we have at least 2 characters
  const shouldFetch = debouncedQuery.length > 1;

  const { 
    data: artists = [], 
    isLoading 
  } = useQuery({
    queryKey: ['artistSearch', debouncedQuery],
    queryFn: () => searchArtistsWithEvents(debouncedQuery),
    enabled: shouldFetch,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

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

        <div className="max-w-xl mx-auto mb-8 relative">
          <div className="relative">
            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-white/60" />
            </div>
            <Input
              type="text"
              placeholder="Search for artists, venues, or cities..."
              value={searchQuery}
              onChange={handleChange}
              className="pl-10 py-6 h-12 bg-white/10 border-white/10 text-white placeholder:text-white/60 rounded-md w-full focus-visible:ring-white/30"
            />
          </div>
          
          {/* Display search results */}
          {shouldFetch && searchQuery && (
            <div className="absolute w-full z-50 mt-1 bg-[#0A0A10]/95 border border-white/10 rounded-md shadow-lg max-h-[70vh] overflow-auto">
              <ArtistSearchResults 
                query={debouncedQuery}
                onSelect={handleArtistSelect}
                simplified={true}
              />
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default Hero;
