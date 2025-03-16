
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
    <section 
      className="relative bg-cover bg-center"
      style={{
        backgroundImage: show.image_url ? `linear-gradient(to bottom, rgba(0,0,0,0.7), rgba(0,0,0,0.4)), url(${show.image_url})` : undefined,
        backgroundColor: 'rgba(0,0,0,0.8)',
        height: 'auto' // Reduced height
      }}
    >
      <div className="px-6 md:px-8 lg:px-12 py-8 relative z-10"> {/* Reduced vertical padding */}
        <div className="max-w-7xl mx-auto">
          {show.artist && (
            <Link to={`/artists/${show.artist.id}`} className="text-white/80 hover:text-white inline-flex items-center mb-2 transition-colors">
              <ArrowLeft size={16} className="mr-2" />
              Back to artist
            </Link>
          )}
          
          <div className="mb-2">
            <span className="inline-block bg-primary/20 text-primary-foreground text-xs px-3 py-1 rounded-full">
              {new Date(show.date) > new Date() ? 'Upcoming' : 'Past'}
            </span>
          </div>
          
          <h1 className="text-2xl md:text-3xl lg:text-3xl font-bold text-white mb-1">{show.artist?.name}</h1>
          
          {tourName && <p className="text-lg text-white/90 mb-3">{tourName}</p>}
          
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6 mt-3">
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
            <div className="mt-5">
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
