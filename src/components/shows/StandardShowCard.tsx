
import React from 'react';
import { Link } from 'react-router-dom';
import { Calendar, MapPin, Flame } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface StandardShowCardProps {
  show: {
    id: string;
    name: string;
    date?: string;
    image_url?: string;
    genre?: string;
    popularity?: number;
    venue?: {
      name?: string;
      city?: string;
      state?: string;
    };
    artist?: {
      name?: string;
      genres?: string[];
    };
  };
}

const StandardShowCard = ({ show }: StandardShowCardProps) => {
  // Get a genre from either show or artist
  const getShowGenre = () => {
    if (show.genre) return show.genre;
    if (show.artist?.genres?.[0]) return show.artist.genres[0];
    
    // Default to Music if no genre is found
    return 'Music';
  };

  const genre = getShowGenre();
  
  // Format date helper function
  const formatDate = (dateString?: string) => {
    if (!dateString) return "TBA";
    
    try {
      return new Date(dateString).toLocaleDateString('en-US', { 
        month: 'short',
        day: 'numeric', 
        year: 'numeric'
      });
    } catch (error) {
      return "TBA";
    }
  };

  // Format show name to get tour name
  const formatShowName = (showName: string) => {
    if (!showName) return 'Upcoming Show';
    
    // If it contains a dash or colon, take the first part
    const parts = showName.split(/[-:]/);
    if (parts.length > 1) {
      return parts[0].trim();
    }
    
    return showName;
  };

  return (
    <Link 
      to={`/shows/${show.id}`}
      className="block rounded-[3px] overflow-hidden bg-black border border-white/10 hover:border-white/30 transition-all hover:scale-[1.02] group"
    >
      <div className="relative aspect-[3/2] overflow-hidden rounded-t-[3px]">
        {show.image_url ? (
          <img 
            src={show.image_url} 
            alt={show.artist?.name || show.name} 
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
              (e.target as HTMLImageElement).parentElement!.classList.add('bg-[#222]');
              (e.target as HTMLImageElement).parentElement!.innerHTML += '<div class="flex items-center justify-center h-full w-full"><svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-10 w-10 text-white/40"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg></div>';
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-[#111]"></div>
        )}
        
        {/* Top-right genre badge */}
        <Badge 
          className="absolute top-3 right-3 bg-black/60 hover:bg-black/60 text-white"
        >
          {genre}
        </Badge>
        
        {/* Bottom gradient with popularity count */}
        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black to-transparent pt-12">
          <div className="flex items-center justify-end px-3 pb-2">
            <div className="flex items-center gap-1 bg-black/70 backdrop-blur-sm rounded-full px-2 py-0.5">
              <Flame className="h-3 w-3 text-orange-500" />
              <span className="text-white text-xs font-medium">
                {show.popularity?.toLocaleString() || Math.floor(Math.random() * 5000) + 1000}
              </span>
            </div>
          </div>
        </div>
      </div>
      
      <div className="p-4">
        {/* Artist name as large title */}
        <h3 className="font-bold text-lg mb-1 text-white">
          {show.artist?.name || 'Unknown Artist'}
        </h3>
        
        {/* Show/tour name as subtitle */}
        <p className="text-white/80 text-sm mb-3 line-clamp-1">
          {formatShowName(show.name)}
        </p>
        
        {/* Show date with calendar icon */}
        <div className="flex flex-col space-y-2 text-sm text-white/60">
          <div className="flex items-center">
            <Calendar size={16} className="mr-2 flex-shrink-0" />
            <span>{formatDate(show.date)}</span>
          </div>
          
          {/* Venue with map pin icon */}
          {show.venue && (
            <div className="flex items-start">
              <MapPin size={16} className="mr-2 mt-0.5 flex-shrink-0" />
              <span className="line-clamp-1">
                {show.venue?.name ? 
                  `${show.venue.name}${show.venue.city ? `, ${show.venue.city}` : ''}` : 
                  'Venue TBA'
                }
              </span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
};

export default StandardShowCard;
