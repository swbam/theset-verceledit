import React from 'react';
import { Link } from 'react-router-dom';
import { Calendar, MapPin, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface ShowCardProps {
  show: {
    id: string;
    date: string;
    venue?: {
      name?: string;
      city?: string;
      state?: string;
    };
    ticket_url?: string;
  };
  className?: string;
}

const ShowCard = ({ show, className }: ShowCardProps) => {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const options: Intl.DateTimeFormatOptions = { 
      month: 'long', 
      day: 'numeric', 
      year: 'numeric' 
    };
    return date.toLocaleDateString('en-US', options);
  };

  return (
    <Card className={cn(
      "bg-zinc-900/50 border-zinc-800/50 hover:border-zinc-700/50 transition-all",
      className
    )}>
      <CardContent className="p-4">
        <div className="flex items-center gap-3 text-zinc-400 mb-3">
          <Calendar className="h-4 w-4" />
          <span className="font-medium text-sm">{formatDate(show.date)}</span>
        </div>

        <div className="space-y-2">
          <h3 className="font-semibold text-lg">{show.venue?.name || "Venue TBA"}</h3>
          {show.venue && (
            <div className="flex items-center text-sm text-zinc-400">
              <MapPin className="h-3.5 w-3.5 mr-1.5 flex-shrink-0" />
              <span>
                {show.venue.city || ""}
                {show.venue.state && show.venue.city ? `, ${show.venue.state}` : show.venue.state || ""}
              </span>
            </div>
          )}
        </div>

        <div className="flex gap-2 mt-4">
          <Button 
            size="sm" 
            variant="secondary" 
            className="flex-1"
            asChild
          >
            <Link to={`/shows/${show.id}`}>
              View Setlist
            </Link>
          </Button>
          
          {show.ticket_url && (
            <Button 
              size="sm" 
              variant="outline" 
              className="flex-1"
              asChild
            >
              <a 
                href={show.ticket_url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center"
              >
                Tickets
                <ExternalLink className="ml-1.5 h-3 w-3" />
              </a>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ShowCard; 