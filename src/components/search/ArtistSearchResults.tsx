import React from 'react';
import { Link } from 'react-router-dom';
import { Music } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Artist {
  id: string;
  name: string;
  image?: string;
  upcomingShows: number;
  popularity?: number;
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
  // Sort artists by popularity (if available) or by upcoming shows count
  const sortedArtists = [...artists].sort((a, b) => {
    // If popularity is available, use it for sorting (higher first)
    if (a.popularity !== undefined && b.popularity !== undefined) {
      return b.popularity - a.popularity;
    }
    // Otherwise sort by number of upcoming shows (higher first)
    return b.upcomingShows - a.upcomingShows;
  });

  if (isLoading) {
    return (
      <div className={cn("py-1 bg-zinc-900 border border-zinc-800 rounded-lg shadow-lg", className)}>
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-3 py-2">
            <div className="w-10 h-10 rounded-md bg-zinc-800 animate-pulse"></div>
            <div className="flex-1">
              <div className="h-4 w-24 bg-zinc-800 rounded animate-pulse"></div>
              <div className="h-3 w-16 bg-zinc-800 rounded mt-1 animate-pulse"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (sortedArtists.length === 0) {
    return null;
  }

  return (
    <div className={cn("py-1 bg-zinc-900 border border-zinc-800 rounded-lg shadow-lg divide-y divide-zinc-800", className)}>
      {sortedArtists.map((artist) => (
        <Link
          key={artist.id}
          to={`/artists/${artist.id}`}
          className="flex items-center gap-3 px-3 py-2 hover:bg-zinc-800 transition-colors"
          onClick={(e) => {
            e.preventDefault(); // Prevent default to allow our custom handler
            onSelect?.(artist);
          }}
        >
          {artist.image ? (
            <img 
              src={artist.image} 
              alt={artist.name} 
              className="w-10 h-10 rounded-md object-cover"
            />
          ) : (
            <div className="w-10 h-10 rounded-md bg-zinc-800 flex items-center justify-center">
              <Music className="h-5 w-5 text-zinc-400" />
            </div>
          )}
          
          <div>
            <div className="font-medium text-white">{artist.name}</div>
            <div className="text-xs text-zinc-400">
              {artist.upcomingShows} upcoming {artist.upcomingShows === 1 ? 'show' : 'shows'}
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
};

export default ArtistSearchResults;
