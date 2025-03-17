
import React from 'react';
import { Link } from 'react-router-dom';
import { Calendar, MapPin, Music, Ticket } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/lib/api/mock-service';

interface ShowCardProps {
  show: {
    id: string;
    name: string;
    date?: string;
    image_url?: string;
    ticket_url?: string;
    genre?: string;
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

const ShowCard = ({ show }: ShowCardProps) => {
  // Get a genre from either show or artist
  const getShowGenre = () => {
    if (show.genre) return show.genre;
    if (show.artist?.genres?.[0]) return show.artist.genres[0];
    
    // Assign a random genre for demo purposes if none exists
    const genres = ['Pop', 'Rock', 'Hip-hop', 'Latin', 'R&B', 'Country', 'Electronic'];
    return genres[Math.floor(Math.random() * genres.length)];
  };

  const genre = getShowGenre();

  return (
    <Card className="bg-[#111111]/80 border-white/10 overflow-hidden hover:border-white/30 transition duration-300 hover:scale-[1.01]">
      <div className="relative aspect-[3/2] overflow-hidden">
        {show.image_url ? (
          <img
            src={show.image_url}
            alt={show.artist?.name || show.name}
            className="w-full h-full object-cover transition-transform"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-[#222]">
            <Music className="h-10 w-10 text-white/40" />
          </div>
        )}
        <Badge 
          className="absolute top-3 right-3 bg-black/60 hover:bg-black/60 text-white"
        >
          {genre}
        </Badge>
        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black to-transparent pt-10">
          <div className="p-3">
            {show.date && (
              <div className="inline-flex items-center bg-white/10 rounded-full px-2 py-1 mb-2">
                <Calendar size={14} className="mr-1 flex-shrink-0" />
                <span className="text-white text-xs font-medium">{formatDate(show.date, false)}</span>
              </div>
            )}
          </div>
        </div>
      </div>
      
      <CardContent className="p-3">
        <h3 className="font-bold text-lg mb-0.5 line-clamp-1">
          {show.artist?.name || 'Unknown Artist'}
        </h3>
        
        <p className="text-white/70 text-sm mb-2 line-clamp-1">
          {show.name.split(' - ')[0]}
        </p>
        
        {show.venue && (
          <div className="flex items-start mb-3">
            <MapPin size={16} className="mr-1.5 flex-shrink-0 mt-0.5 text-white/60" />
            <span className="text-sm text-white/60 line-clamp-1">
              {show.venue.name}
              {show.venue.city && `, ${show.venue.city}`}
            </span>
          </div>
        )}
        
        <Button className="w-full" size="sm" asChild>
          <Link to={`/shows/${show.id}`}>
            <Ticket className="h-4 w-4 mr-1.5" />
            View Setlist
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
};

export default ShowCard;
