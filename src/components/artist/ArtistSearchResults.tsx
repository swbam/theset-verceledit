
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Music2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { searchArtists } from '@/lib/spotify';

interface ArtistSearchResultsProps {
  searchQuery: string;
  className?: string;
}

const ArtistSearchResults = ({ searchQuery, className }: ArtistSearchResultsProps) => {
  const { 
    data, 
    isLoading, 
    error 
  } = useQuery({
    queryKey: ['artistSearch', searchQuery],
    queryFn: () => searchArtists(searchQuery),
    enabled: searchQuery.length > 1,
  });

  const artists = data?.artists?.items || [];

  if (isLoading) {
    return (
      <div className={cn("space-y-4", className)}>
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex items-center gap-3 p-3 rounded-lg animate-pulse">
            <div className="w-12 h-12 bg-secondary rounded-full"></div>
            <div className="space-y-2 flex-1">
              <div className="h-4 bg-secondary rounded w-1/2"></div>
              <div className="h-3 bg-secondary rounded w-1/3"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn("p-4 text-center text-muted-foreground", className)}>
        Error loading results. Please try again.
      </div>
    );
  }

  if (!artists.length && searchQuery) {
    return (
      <div className={cn("p-4 text-center", className)}>
        <Music2 className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
        <p className="text-muted-foreground">No artists found</p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-1", className)}>
      {artists.map((artist: any) => (
        <Link
          key={artist.id}
          to={`/artists/${artist.id}`}
          className="flex items-center gap-3 p-3 rounded-lg hover:bg-secondary transition-colors"
        >
          {artist.images && artist.images[0] ? (
            <img 
              src={artist.images[0].url} 
              alt={artist.name}
              className="w-12 h-12 rounded-full object-cover"
            />
          ) : (
            <div className="w-12 h-12 bg-secondary rounded-full flex items-center justify-center">
              <Music2 className="h-6 w-6 text-muted-foreground" />
            </div>
          )}
          
          <div>
            <p className="font-medium">{artist.name}</p>
            {artist.genres && artist.genres.length > 0 && (
              <p className="text-xs text-muted-foreground">
                {artist.genres.slice(0, 2).join(', ')}
              </p>
            )}
          </div>
        </Link>
      ))}
    </div>
  );
};

export default ArtistSearchResults;
