
import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Calendar, MapPin, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';

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
  const isMobile = useIsMobile();
  
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
      className="relative bg-cover bg-center header-gradient"
      style={{
        backgroundImage: show.image_url ? `linear-gradient(to bottom, rgba(0,0,0,0.8), rgba(0,0,0,0.7)), url(${show.image_url})` : undefined,
        height: 'auto',
        maxHeight: isMobile ? '35vh' : 'auto',
      }}
    >
      <div className={`px-4 md:px-8 lg:px-12 ${isMobile ? 'py-4' : 'py-12'} relative z-10`}>
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-2">
            {show.artist && (
              <Link to={`/artists/${show.artist.id}`} className="text-white/80 hover:text-white inline-flex items-center transition-colors">
                <ArrowLeft size={16} className="mr-1" />
                <span className={`${isMobile ? 'text-xs' : 'text-sm'}`}>Back to artist</span>
              </Link>
            )}
            
            <span className="inline-block bg-white/20 text-white text-xs px-2 py-0.5 rounded-full">
              {new Date(show.date) > new Date() ? 'Upcoming' : 'Past'}
            </span>
          </div>
          
          <h1 className={`${isMobile ? 'text-xl' : 'text-3xl md:text-4xl lg:text-5xl'} font-bold text-white mb-1`}>{show.artist?.name}</h1>
          
          {tourName && <p className={`${isMobile ? 'text-sm' : 'text-xl'} text-white/90 mb-2`}>{tourName}</p>}
          
          <div className={`flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-6 mt-2`}>
            <div className={`flex items-center text-white/80 ${isMobile ? 'text-xs' : ''}`}>
              <Calendar size={isMobile ? 14 : 18} className="mr-1.5 text-white/60" />
              {formatDate(show.date)}
            </div>
            
            {show.venue && (
              <div className={`flex items-center text-white/80 ${isMobile ? 'text-xs' : ''}`}>
                <MapPin size={isMobile ? 14 : 18} className="mr-1.5 text-white/60" />
                {show.venue.name}, {show.venue.city}, {show.venue.state}
              </div>
            )}
          </div>
          
          {show.ticket_url && (
            <div className={`${isMobile ? 'mt-2' : 'mt-6'}`}>
              <Button asChild className="bg-white hover:bg-white/90 text-black" size={isMobile ? "sm" : "default"}>
                <a 
                  href={show.ticket_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center"
                >
                  <span>Get Tickets</span>
                  <ExternalLink size={isMobile ? 14 : 16} className="ml-2" />
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
