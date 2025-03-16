
import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Calendar, MapPin, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ShowHeaderProps {
  show: {
    id: string;
    name: string;
    date: string;
    image_url?: string;
    ticket_url?: string;
    artist?: {
      id: string;
      name: string;
    };
    venue?: {
      name: string;
      city: string;
      state: string;
    };
  };
}

const ShowHeader: React.FC<ShowHeaderProps> = ({ show }) => {
  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      month: 'long', 
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    }).format(date);
  };

  return (
    <section 
      className="relative bg-cover bg-center"
      style={{
        backgroundImage: show.image_url ? `linear-gradient(to bottom, rgba(0,0,0,0.7), rgba(0,0,0,0.4)), url(${show.image_url})` : undefined,
        backgroundColor: 'rgba(0,0,0,0.8)'
      }}
    >
      <div className="px-6 md:px-8 lg:px-12 py-20 relative z-10">
        <div className="max-w-7xl mx-auto">
          {show.artist && (
            <Link to={`/artists/${show.artist.id}`} className="text-white/80 hover:text-white inline-flex items-center mb-4 transition-colors">
              <ArrowLeft size={16} className="mr-2" />
              Back to artist
            </Link>
          )}
          
          <div className="mb-2">
            <span className="inline-block bg-primary/20 text-primary-foreground text-xs px-3 py-1 rounded-full">
              {new Date(show.date) > new Date() ? 'Upcoming' : 'Past'}
            </span>
          </div>
          
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-3">{show.name}</h1>
          
          {show.artist && <p className="text-lg text-white/80 mb-6">{show.artist.name}</p>}
          
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-8 mt-6">
            <div className="flex items-center text-white/90">
              <Calendar size={18} className="mr-2" />
              {formatDate(show.date)}
            </div>
            
            {show.venue && (
              <div className="flex items-center text-white/90">
                <MapPin size={18} className="mr-2" />
                {show.venue.name}, {show.venue.city}, {show.venue.state}
              </div>
            )}
          </div>
          
          {show.ticket_url && (
            <div className="mt-8">
              <Button asChild className="bg-primary hover:bg-primary/90">
                <a 
                  href={show.ticket_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center"
                >
                  <span>Get Tickets</span>
                  <ExternalLink size={16} className="ml-2" />
                </a>
              </Button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default ShowHeader;
