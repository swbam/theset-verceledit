
import React from 'react';
import { Link } from 'react-router-dom';
import { Music } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Artist {
  id: string;
  name: string;
  image?: string;
  upcomingShows: number;
}

interface ArtistSearchResultsProps {
  artists: Artist[];
  isLoading: boolean;
  onSelect?: (artist: Artist) => void;
  className?: string;
}

const ArtistSearchResults = ({ 
  artists, 
  isLoading, 
  onSelect,
  className 
}: ArtistSearchResultsProps) => {
  if (isLoading) {
    return (
      <div className={cn("py-1 bg-background border border-border rounded-lg shadow-lg", className)}>
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-3 py-2">
            <div className="w-10 h-10 rounded-md bg-secondary animate-pulse"></div>
            <div className="flex-1">
              <div className="h-4 w-24 bg-secondary rounded animate-pulse"></div>
              <div className="h-3 w-16 bg-secondary rounded mt-1 animate-pulse"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (artists.length === 0) {
    return null;
  }

  const handleSelect = (artist: Artist) => {
    if (onSelect) {
      console.log(`Artist selected: ${artist.name} (ID: ${artist.id})`);
      onSelect(artist);
    }
  };

  return (
    <div className={cn("py-1 bg-background border border-border rounded-lg shadow-lg divide-y divide-border", className)}>
      {artists.map((artist) => (
        <Link
          key={artist.id}
          to={`/artists/${artist.id}`}
          className="flex items-center gap-3 px-3 py-2 hover:bg-secondary transition-colors"
          onClick={() => handleSelect(artist)}
        >
          {artist.image ? (
            <img 
              src={artist.image} 
              alt={artist.name} 
              className="w-10 h-10 rounded-md object-cover"
            />
          ) : (
            <div className="w-10 h-10 rounded-md bg-secondary flex items-center justify-center">
              <Music className="h-5 w-5 text-muted-foreground" />
            </div>
          )}
          
          <div>
            <div className="font-medium">{artist.name}</div>
            <div className="text-xs text-muted-foreground">
              {artist.upcomingShows} upcoming {artist.upcomingShows === 1 ? 'show' : 'shows'}
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
};

export default ArtistSearchResults;
