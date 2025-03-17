import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useQuery } from '@tanstack/react-query';
import { searchArtistsWithEvents } from '@/lib/api/artist';
import ArtistSearchResults from '@/components/search/ArtistSearchResults';

const Hero = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);

    return () => {
      clearTimeout(handler);
    };
  }, [searchQuery]);

  const { data: artists = [], isLoading } = useQuery({
    queryKey: ['homeSearch', debouncedQuery],
    queryFn: () => searchArtistsWithEvents(debouncedQuery),
    enabled: debouncedQuery.length > 2,
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim() && artists.length > 0) {
      navigate(`/artists/${artists[0].id}`);
      setSearchQuery('');
      setIsSearchFocused(false);
    }
  };

  const handleArtistSelect = (artist: any) => {
    navigate(`/artists/${artist.id}`);
    setSearchQuery('');
    setIsSearchFocused(false);
  };

  const popularArtists = [
    { name: "Taylor Swift", id: "K8vZ91712W7" },
    { name: "Coldplay", id: "K8vZ9175rX7" },
    { name: "Bad Bunny", id: "K8vZ9172zyV" },
    { name: "New York", path: "New York" }
  ];

  return (
    <section className="relative bg-black text-white py-16 md:py-24">
      <div className="container mx-auto px-4 md:px-6 max-w-5xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4">
            Vote on the setlists<br />
            you want to hear
          </h1>
          <p className="text-lg text-white/80 max-w-2xl mx-auto mb-8">
            Discover upcoming concerts and help shape the perfect
            show by voting for your favorite songs.
          </p>
        </div>

        <div className="max-w-xl mx-auto mb-8 relative">
          <form onSubmit={handleSearch} className="relative">
            <div className="relative">
              <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-white/60" />
              </div>
              <Input
                type="text"
                placeholder="Search for artists, venues, or cities..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setIsSearchFocused(true)}
                className="pl-10 py-6 h-14 bg-black/40 border-white/10 text-white placeholder:text-white/60 rounded-md w-full focus-visible:ring-white/30"
              />
            </div>
          </form>
          
          {isSearchFocused && searchQuery.length > 2 && (
            <div className="absolute left-0 right-0 mt-2 z-10">
              <ArtistSearchResults
                artists={artists}
                isLoading={isLoading}
                onSelect={handleArtistSelect}
                className="border-white/10"
              />
            </div>
          )}
        </div>

        <div className="flex flex-wrap justify-center gap-2 mt-4">
          {popularArtists.map((artist) => (
            <Button
              key={artist.name}
              variant="outline"
              size="sm"
              className="bg-black/40 hover:bg-black/60 border border-white/20 text-white rounded-full px-4 py-1"
              onClick={() => {
                if (artist.id) {
                  navigate(`/artists/${artist.id}`);
                } else if (artist.path) {
                  navigate(`/search?q=${encodeURIComponent(artist.path)}`);
                }
              }}
            >
              {artist.name}
            </Button>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Hero;
