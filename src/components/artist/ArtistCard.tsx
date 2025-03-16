
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Music2, CalendarDays } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ArtistCardProps {
  artist: {
    id: string;
    name: string;
    image?: string;
    genres?: string[];
    upcoming_shows?: number;
  };
  className?: string;
}

const ArtistCard = ({ artist, className }: ArtistCardProps) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  
  return (
    <Link 
      to={`/artists/${artist.id}`} 
      className={cn(
        "group block overflow-hidden rounded-xl transition-all hover-scale",
        "border border-border bg-card shadow-sm",
        className
      )}
    >
      <div className="relative aspect-square overflow-hidden bg-secondary">
        {/* Blurred placeholder */}
        <div className={cn(
          "absolute inset-0 bg-secondary animate-pulse", 
          imageLoaded ? "opacity-0" : "opacity-100"
        )} />
        
        {artist.image ? (
          <img
            src={artist.image}
            alt={artist.name}
            className={cn(
              "object-cover w-full h-full transition-all duration-500",
              imageLoaded ? "opacity-100 scale-100" : "opacity-0 scale-110"
            )}
            onLoad={() => setImageLoaded(true)}
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <Music2 size={48} className="text-foreground/20" />
          </div>
        )}
      </div>
      
      <div className="p-5">
        <h3 className="font-semibold text-lg transition-colors group-hover:text-primary truncate">
          {artist.name}
        </h3>
        
        {artist.genres && artist.genres.length > 0 && (
          <p className="text-sm text-muted-foreground mt-1 truncate">
            {artist.genres.slice(0, 2).join(', ')}
          </p>
        )}
        
        {typeof artist.upcoming_shows === 'number' && (
          <div className="flex items-center mt-4 text-sm text-muted-foreground">
            <CalendarDays size={14} className="mr-2" />
            {artist.upcoming_shows > 0 
              ? `${artist.upcoming_shows} upcoming shows`
              : "No upcoming shows"
            }
          </div>
        )}
      </div>
    </Link>
  );
};

export default ArtistCard;
