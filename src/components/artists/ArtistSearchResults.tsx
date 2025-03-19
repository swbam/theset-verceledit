
import React, { useState, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { searchArtistsWithEvents } from '@/lib/api/artist';
import ArtistCard from '@/components/artist/ArtistCard';

interface ArtistSearchResultsProps {
  query: string;
}

const ArtistSearchResults: React.FC<ArtistSearchResultsProps> = ({ query }) => {
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
      <div className="text-center py-8">
        <p className="text-muted-foreground">Type at least 2 characters to search</p>
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="text-center py-16">
        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
        <p className="text-muted-foreground">Searching for artists...</p>
      </div>
    );
  }

  // Error state
  if (isError) {
    return (
      <div className="text-center py-12">
        <p className="text-destructive mb-2">Error searching for artists</p>
        <p className="text-muted-foreground text-sm">{error instanceof Error ? error.message : 'An unknown error occurred'}</p>
      </div>
    );
  }

  // No results
  if (artists.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="font-medium mb-2">No artists found</p>
        <p className="text-muted-foreground text-sm">
          Try searching for another artist who has upcoming shows
        </p>
      </div>
    );
  }

  // Results
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
      {artists.map((artist) => (
        <ArtistCard 
          key={artist.id}
          artist={artist}
        />
      ))}
    </div>
  );
};

export default ArtistSearchResults;
