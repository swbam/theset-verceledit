import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import ArtistSearchResults from '@/components/search/ArtistSearchResults';
import { searchArtistsWithEvents } from '@/lib/ticketmaster';
import { useDebounce } from '@/hooks/use-debounce';
import { useOnClickOutside } from '@/hooks/use-click-outside';

const NavbarSearch = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [artists, setArtists] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  
  // Handle outside click to close dropdown
  useOnClickOutside(searchRef, () => setIsFocused(false));
  
  // Search for artists when the debounced query changes
  useEffect(() => {
    const fetchArtists = async () => {
      if (debouncedSearchQuery.length < 3) {
        setArtists([]);
        return;
      }
      
      setIsLoading(true);
      try {
        console.log('Searching for artists:', debouncedSearchQuery);
        const results = await searchArtistsWithEvents(debouncedSearchQuery);
        console.log('Search results:', results);
        setArtists(results);
      } catch (error) {
        console.error('Error searching for artists:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchArtists();
  }, [debouncedSearchQuery]);
  
  // Function to handle full search (when pressing Enter)
  const handleFullSearch = (query: string) => {
    if (query.trim().length > 0) {
      setIsFocused(false);
      navigate(`/search?q=${encodeURIComponent(query)}`);
    }
  };
  
  // Function to handle artist selection
  const handleSelectArtist = (artistId: string) => {
    setIsFocused(false);
    setSearchQuery('');
    navigate(`/artists/${artistId}`);
  };
  
  return (
    <div ref={searchRef} className="relative max-w-md w-full">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-400 h-4 w-4" />
        <Input
          type="text"
          placeholder="Search for artists with upcoming shows..."
          className="pl-10 bg-zinc-900 border-zinc-800 focus:border-zinc-700 w-full"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleFullSearch(searchQuery);
            }
          }}
        />
      </div>
      
      {isFocused && (searchQuery.length > 0 || isLoading) && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1">
          <ArtistSearchResults
            artists={artists}
            isLoading={isLoading}
            onSelect={handleSelectArtist}
            className="max-h-[70vh] overflow-y-auto"
          />
          
          {searchQuery.length >= 3 && artists.length > 0 && (
            <div className="px-4 py-2 text-xs text-zinc-400 bg-zinc-900 border border-t-0 border-zinc-800 rounded-b-lg">
              Press Enter to see all results
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NavbarSearch;