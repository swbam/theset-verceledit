
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface ArtistProps {
  artist: {
    id: string;
    name: string;
    image: string;
    genres?: string[];
    upcoming_shows?: number;
  };
  className?: string;
}

const ArtistCard = ({ artist, className }: ArtistProps) => {
  const [imageLoaded, setImageLoaded] = useState(false);

  return (
    <Link 
      to={`/artists/${artist.id}`} 
      className={cn("group block overflow-hidden rounded-2xl transition-all hover-scale", className)}
    >
      <div className="relative aspect-square overflow-hidden rounded-2xl bg-secondary">
        {/* Blurred placeholder */}
        <div className={cn(
          "absolute inset-0 bg-secondary animate-pulse", 
          imageLoaded ? "opacity-0" : "opacity-100"
        )} />
        
        <img
          src={artist.image}
          alt={artist.name}
          className={cn(
            "object-cover w-full h-full transition-all duration-500",
            imageLoaded ? "opacity-100 scale-100" : "opacity-0 scale-110"
          )}
          onLoad={() => setImageLoaded(true)}
        />
        
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
      
      <div className="mt-4">
        <h3 className="font-medium text-lg transition-colors group-hover:text-primary">{artist.name}</h3>
        
        {artist.genres && artist.genres.length > 0 && (
          <p className="text-sm text-muted-foreground mt-1">
            {artist.genres.slice(0, 2).join(', ')}
          </p>
        )}
        
        {artist.upcoming_shows !== undefined && artist.upcoming_shows > 0 && (
          <p className="text-sm font-medium mt-2 inline-block bg-secondary px-3 py-1 rounded-full">
            {artist.upcoming_shows} upcoming {artist.upcoming_shows === 1 ? 'show' : 'shows'}
          </p>
        )}
      </div>
    </Link>
  );
};

export default ArtistCard;
