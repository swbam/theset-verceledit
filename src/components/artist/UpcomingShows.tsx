import React from 'react';
import { Link } from 'react-router-dom';
import { Calendar, MapPin, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface UpcomingShowsProps {
  shows: any[];
  artistName: string;
}

const UpcomingShows = ({ shows, artistName }: UpcomingShowsProps) => {
  // Format date to display in a more compact format (May 31, 2025)
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const options: Intl.DateTimeFormatOptions = { 
      month: 'long', 
      day: 'numeric', 
      year: 'numeric' 
    };
    return date.toLocaleDateString('en-US', options);
  };

  // If no shows, display a message
  if (shows.length === 0) {
    return (
      <div className="text-center p-8 border border-zinc-800 rounded-lg bg-zinc-900/50">
        <p className="text-lg mb-4 text-white">No upcoming concerts found for this artist.</p>
        <Button variant="outline" asChild>
          <Link to="/shows">Discover other shows</Link>
        </Button>
      </div>
    );
  }

  // Display the shows in a list
  return (
    <div className="space-y-4">
      {shows.map((show) => (
        <div 
          key={show.id} 
          className="border-b border-zinc-800 pb-4 last:border-0 last:pb-0"
        >
          <div className="flex items-start mb-2">
            <Calendar className="h-5 w-5 text-zinc-400 mr-3 mt-0.5" />
            <span className="font-medium">{formatDate(show.date)}</span>
          </div>
          
          <div className="pl-8">
            <h3 className="font-bold">{show.venue?.name || "Venue TBA"}</h3>
            <div className="flex items-center text-zinc-400 text-sm mb-3">
              <MapPin className="h-3.5 w-3.5 mr-1.5 flex-shrink-0" />
              <span>
                {show.venue?.city || ""}
                {show.venue?.state && show.venue?.city ? `, ${show.venue.state}` : show.venue?.state || ""}
              </span>
            </div>
          
            <div className="flex space-x-2">
              <Button size="sm" variant="secondary" asChild className="px-4">
                <Link to={`/shows/${show.id}`}>
                  Setlist
                </Link>
              </Button>
              
              {show.ticket_url && (
                <Button size="sm" variant="outline" asChild className="px-4">
                  <a href={show.ticket_url} target="_blank" rel="noopener noreferrer">
                    Tickets
                    <ExternalLink className="ml-1.5 h-3 w-3" />
                  </a>
                </Button>
              )}
            </div>
          </div>
        </div>
      ))}
      
      {shows.length > 5 && (
        <div className="text-right mt-6">
          <Button variant="link" asChild>
            <Link to={`/shows?artist=${encodeURIComponent(artistName)}`}>
              See all {shows.length} shows
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
};

export default UpcomingShows;
