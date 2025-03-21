
import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Loader2, Music, CalendarDays } from 'lucide-react';
import { searchArtistsWithEvents } from '@/lib/api/artist';

interface ArtistSearchResultsProps {
  query: string;
  onSelect?: (artist: any) => void;
  simplified?: boolean;
}

const ArtistSearchResults: React.FC<ArtistSearchResultsProps> = ({ 
  query, 
  onSelect,
  simplified = false
}) => {
  const [debouncedQuery, setDebouncedQuery] = useState(query);
  
  // Implement proper debounce with useCallback and useEffect
  useEffect(() => {
    const timerId = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);
    
    return () => {
      clearTimeout(timerId);
    };
  }, [query]);
  
  const { 
    data: artists = [], 
    isLoading, 
    isError,
    error 
  } = useQuery({
    queryKey: ['artistSearch', debouncedQuery],
    queryFn: () => searchArtistsWithEvents(debouncedQuery),
    enabled: debouncedQuery.length > 1,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30,   // 30 minutes
    meta: {
      onError: (err: any) => {
        console.error('Artist search error:', err);
      }
    }
  });

  // Early return for empty queries
  if (debouncedQuery.length < 2) {
    return (
      <div className="text-center py-4">
        <p className="text-muted-foreground text-sm">Type at least 2 characters to search</p>
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="text-center py-6">
        <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />
        <p className="text-muted-foreground text-sm">Searching for artists...</p>
      </div>
    );
  }

  // Error state
  if (isError) {
    return (
      <div className="text-center py-4">
        <p className="text-destructive text-sm mb-1">Error searching for artists</p>
        <p className="text-muted-foreground text-xs">{error instanceof Error ? error.message : 'An unknown error occurred'}</p>
      </div>
    );
  }

  // No results
  if (artists.length === 0) {
    return (
      <div className="text-center py-6">
        <p className="font-medium text-sm mb-1">No artists found</p>
        <p className="text-muted-foreground text-xs">
          Try searching for another artist who has upcoming shows
        </p>
      </div>
    );
  }

  // Simplified results for homepage search (no images, compact layout)
  if (simplified) {
    return (
      <div className="py-1">
        {artists.slice(0, 8).map((artist) => (
          <div
            key={artist.id}
            onClick={() => onSelect && onSelect(artist)}
            className="px-4 py-2.5 hover:bg-secondary/80 cursor-pointer transition-colors"
          >
            <div className="flex items-center justify-between">
              <div className="font-medium">{artist.name}</div>
              {typeof artist.upcomingShows === 'number' && (
                <div className="text-xs flex items-center text-muted-foreground">
                  <CalendarDays size={12} className="mr-1" />
                  {artist.upcomingShows} {artist.upcomingShows === 1 ? 'show' : 'shows'}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Regular grid results for search page
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
      {artists.map((artist) => (
        <div key={artist.id} onClick={() => onSelect && onSelect(artist)}>
          <ArtistCard 
            key={artist.id}
            artist={artist}
          />
        </div>
      ))}
    </div>
  );
};

export default ArtistSearchResults;
