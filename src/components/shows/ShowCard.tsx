
import React from 'react';
import { Link } from 'react-router-dom';
import { Calendar, MapPin, ExternalLink, Music } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/lib/api/mock-service';

interface ShowCardProps {
  show: {
    id: string;
    name: string;
    date?: string;
    image_url?: string;
    ticket_url?: string;
    venue?: {
      name?: string;
      city?: string;
      state?: string;
    };
    artist?: {
      name?: string;
    };
  };
}

const ShowCard = ({ show }: ShowCardProps) => {
  // Format the show name to remove artist name and delivery info
  const formatShowName = (fullName: string, artistName: string) => {
    if (!fullName) return '';
    
    // Remove the artist name and any text after "delivered by" or similar phrases
    let formattedName = fullName;
    
    // Remove artist name if present at the beginning
    if (artistName && formattedName.startsWith(artistName)) {
      formattedName = formattedName.substring(artistName.length).trim();
      // Remove any colon at the beginning
      if (formattedName.startsWith(':')) {
        formattedName = formattedName.substring(1).trim();
      }
    }
    
    // Remove delivery information
    const deliveryPhrases = [' - delivered by ', ' delivered by ', ' - presented by ', ' presented by '];
    for (const phrase of deliveryPhrases) {
      const index = formattedName.toLowerCase().indexOf(phrase.toLowerCase());
      if (index !== -1) {
        formattedName = formattedName.substring(0, index);
      }
    }
    
    return formattedName;
  };

  // Get the formatted show name
  const tourName = formatShowName(show.name, show.artist?.name || '');

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden hover:shadow-md transition-all hover:border-primary/30 group relative">
      <div className="aspect-[5/3] bg-secondary overflow-hidden relative">
        {show.image_url ? (
          <img
            src={show.image_url}
            alt={show.name}
            className="w-full h-full object-cover transition-transform group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-secondary/50">
            <Music className="h-10 w-10 text-muted-foreground/50" />
          </div>
        )}
      </div>
      
      <div className="p-4">
        <h3 className="font-medium text-lg mb-1 line-clamp-1 group-hover:text-primary transition-colors">
          {show.artist?.name}
        </h3>
        
        {tourName && (
          <p className="text-primary/80 text-sm mb-3 line-clamp-2">
            {tourName}
          </p>
        )}
        
        <div className="space-y-2 mb-4">
          <div className="flex items-center text-sm text-muted-foreground">
            <Calendar size={16} className="mr-2 flex-shrink-0" />
            <span>{formatDate(show.date, true)}</span>
          </div>
          
          {show.venue && (
            <div className="flex items-center text-sm text-muted-foreground">
              <MapPin size={16} className="mr-2 flex-shrink-0" />
              <span className="line-clamp-1">
                {show.venue.name}
                {show.venue.city && `, ${show.venue.city}`}
                {show.venue.state && `, ${show.venue.state}`}
              </span>
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <Button asChild className="w-full" size="sm">
            <Link to={`/shows/${show.id}`}>
              View Setlist
            </Link>
          </Button>
          
          {show.ticket_url && (
            <Button 
              variant="outline" 
              size="sm" 
              className="flex-shrink-0"
              asChild
            >
              <a href={show.ticket_url} target="_blank" rel="noopener noreferrer">
                <ExternalLink size={16} />
              </a>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ShowCard;
