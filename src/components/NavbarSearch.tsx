import React, { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import SearchBar from './ui/SearchBar';
import { searchArtistsWithEvents } from '@/lib/ticketmaster';
import { Artist } from '@/types/artist';
import Link from 'next/link';
import Image from 'next/image';
import { useDebounce } from '@/hooks/useDebounce';

export function NavbarSearch({ className }: { className?: string }) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [error, setError] = useState<string | null>(null);
  const debouncedQuery = useDebounce(query, 300);

  // Handle search query changes
  const handleChange = (value: string) => {
    setQuery(value);
  };

  // Search for artists when the debounced query changes
  useEffect(() => {
    async function searchArtists() {
      // Don't search if query is too short
      if (!debouncedQuery || debouncedQuery.length < 3) {
        setArtists([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const results = await searchArtistsWithEvents(debouncedQuery);
        setArtists(results);
      } catch (err) {
        console.error('Error searching for artists:', err);
        setError('Failed to search for artists. Please try again.');
        setArtists([]);
      } finally {
        setIsLoading(false);
      }
    }

    searchArtists();
  }, [debouncedQuery]);

  // Handle form submission
  const handleSearch = (searchQuery: string) => {
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  // Handle artist selection
  const handleArtistSelect = (artist: Artist) => {
    router.push(`/artist/${artist.id}`);
  };

  return (
    <div className={className}>
      <SearchBar
        placeholder="Search artists with upcoming shows..."
        value={query}
        onChange={handleChange}
        onSearch={handleSearch}
        isLoading={isLoading}
        autoFocus={false}
      >
        {/* Display search results */}
        <div className="w-full max-h-[400px] overflow-y-auto">
          {error && (
            <div className="p-4 text-red-400 text-sm">{error}</div>
          )}
          
          {!error && query.length >= 3 && artists.length === 0 && !isLoading && (
            <div className="p-4 text-zinc-400 text-sm">
              No artists with upcoming shows found. Try a different search term.
            </div>
          )}
          
          {artists.map((artist) => (
            <Link 
              key={artist.id}
              href={`/artist/${artist.id}`}
              className="flex items-center p-3 hover:bg-zinc-800 transition-colors cursor-pointer"
              onClick={(e) => {
                e.preventDefault();
                handleArtistSelect(artist);
              }}
            >
              {artist.image ? (
                <div className="flex-shrink-0 w-10 h-10 rounded overflow-hidden mr-3">
                  <Image 
                    src={artist.image}
                    alt={artist.name}
                    width={40}
                    height={40}
                    className="object-cover"
                  />
                </div>
              ) : (
                <div className="flex-shrink-0 w-10 h-10 bg-zinc-800 rounded mr-3" />
              )}
              
              <div className="flex-1 min-w-0">
                <p className="text-white font-medium truncate">{artist.name}</p>
                {artist.genres && artist.genres.length > 0 && (
                  <p className="text-zinc-400 text-sm truncate">
                    {artist.genres.slice(0, 2).join(', ')}
                  </p>
                )}
              </div>
            </Link>
          ))}
        </div>
      </SearchBar>
    </div>
  );
}

export default NavbarSearch; 