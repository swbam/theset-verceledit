
import React, { useState, useRef, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { searchArtists } from '@/lib/spotify';

interface SearchBarProps {
  placeholder?: string;
  onSearch?: (query: string) => void;
  className?: string;
  showAutocomplete?: boolean;
}

const SearchBar = ({ 
  placeholder = 'Search artists or shows...', 
  onSearch, 
  className,
  showAutocomplete = false
}: SearchBarProps) => {
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const navigate = useNavigate();
  const resultsRef = useRef<HTMLDivElement>(null);

  // Fetch artist search results
  const { 
    data: searchResults,
    isLoading 
  } = useQuery({
    queryKey: ['quickSearch', query],
    queryFn: () => searchArtists(query, 5),
    enabled: showAutocomplete && query.length > 1,
  });
  
  const artists = searchResults?.artists?.items || [];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (resultsRef.current && !resultsRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      if (onSearch) {
        onSearch(query.trim());
      } else {
        navigate(`/search?q=${encodeURIComponent(query.trim())}`);
      }
      setShowResults(false);
    }
  };

  const clearSearch = () => {
    setQuery('');
    if (onSearch) {
      onSearch('');
    }
    setShowResults(false);
  };

  const handleInputFocus = () => {
    setIsFocused(true);
    if (showAutocomplete && query.length > 1) {
      setShowResults(true);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newQuery = e.target.value;
    setQuery(newQuery);
    
    if (showAutocomplete && newQuery.length > 1) {
      setShowResults(true);
    } else {
      setShowResults(false);
    }
  };

  const navigateToArtist = (artistId: string) => {
    navigate(`/artists/${artistId}`);
    setShowResults(false);
  };

  return (
    <div className={cn("relative group", className)} ref={resultsRef}>
      <form onSubmit={handleSearch}>
        <div className={cn(
          "flex items-center overflow-hidden transition-all duration-300 ease-in-out",
          "bg-background border border-border rounded-full",
          isFocused && "border-foreground/30 ring-2 ring-foreground/5"
        )}>
          <div className="pl-4">
            <Search 
              size={18} 
              className={cn(
                "text-muted-foreground transition-colors",
                isFocused && "text-foreground"
              )} 
            />
          </div>
          
          <input
            type="text"
            value={query}
            onChange={handleInputChange}
            onFocus={handleInputFocus}
            onBlur={() => setIsFocused(false)}
            placeholder={placeholder}
            className="py-3 px-3 w-full bg-transparent focus:outline-none"
            aria-label="Search"
          />
          
          {query && (
            <button
              type="button"
              onClick={clearSearch}
              className="pr-4 text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Clear search"
            >
              <X size={18} />
            </button>
          )}
        </div>
      </form>
      
      {/* Autocomplete Results */}
      {showAutocomplete && showResults && query.length > 1 && (
        <div className="absolute z-50 left-0 right-0 mt-2 bg-background border border-border rounded-xl shadow-lg overflow-hidden">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center gap-3 animate-pulse">
                  <div className="w-8 h-8 bg-secondary rounded-full"></div>
                  <div className="h-4 bg-secondary rounded w-2/3"></div>
                </div>
              ))}
            </div>
          ) : artists.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              No results found
            </div>
          ) : (
            <div className="max-h-[320px] overflow-y-auto">
              {artists.map((artist: any) => (
                <button
                  key={artist.id}
                  className="w-full text-left flex items-center gap-3 p-3 hover:bg-secondary transition-colors"
                  onClick={() => navigateToArtist(artist.id)}
                >
                  {artist.images && artist.images[0] ? (
                    <img 
                      src={artist.images[0].url} 
                      alt={artist.name}
                      className="w-8 h-8 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-8 h-8 bg-secondary rounded-full"></div>
                  )}
                  <div>
                    <p className="font-medium">{artist.name}</p>
                    <p className="text-xs text-muted-foreground">Artist</p>
                  </div>
                </button>
              ))}
              <div className="p-2 bg-secondary/30 border-t border-border">
                <button
                  className="w-full text-center text-sm text-primary p-1 hover:underline"
                  onClick={handleSearch}
                >
                  See all results
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchBar;
