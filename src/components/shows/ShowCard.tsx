
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ShowProps {
  show: {
    id: string;
    name: string;
    date: string;
    image_url?: string;
    venue: {
      name: string;
      city: string;
      state: string;
    };
    artist: {
      name: string;
    };
  };
  className?: string;
}

const ShowCard = ({ show, className }: ShowProps) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  
  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'short',
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    }).format(date);
  };

  return (
    <Link 
      to={`/shows/${show.id}`} 
      className={cn(
        "group block overflow-hidden rounded-xl transition-all hover-scale",
        "border border-border bg-card shadow-sm",
        className
      )}
    >
      {show.image_url && (
        <div className="relative aspect-[16/9] overflow-hidden bg-secondary">
          {/* Blurred placeholder */}
          <div className={cn(
            "absolute inset-0 bg-secondary animate-pulse", 
            imageLoaded ? "opacity-0" : "opacity-100"
          )} />
          
          <img
            src={show.image_url}
            alt={show.name}
            className={cn(
              "object-cover w-full h-full transition-all duration-500",
              imageLoaded ? "opacity-100 scale-100" : "opacity-0 scale-110"
            )}
            onLoad={() => setImageLoaded(true)}
          />
        </div>
      )}
      
      <div className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-semibold text-lg transition-colors group-hover:text-primary">
              {show.name}
            </h3>
            
            <p className="text-sm text-primary/80 mt-1">{show.artist.name}</p>
          </div>
        </div>
        
        <div className="mt-4 space-y-2">
          <div className="flex items-center text-sm text-muted-foreground">
            <Calendar size={16} className="mr-2" />
            {formatDate(show.date)}
          </div>
          
          <div className="flex items-center text-sm text-muted-foreground">
            <MapPin size={16} className="mr-2" />
            {show.venue.name}, {show.venue.city}, {show.venue.state}
          </div>
        </div>
        
        <div className="mt-5 pt-4 border-t border-border">
          <span className="inline-block text-sm font-medium transition-colors bg-secondary/70 px-3 py-1 rounded-full group-hover:bg-primary/10 group-hover:text-primary">
            View Setlist
          </span>
        </div>
      </div>
    </Link>
  );
};

export default ShowCard;
