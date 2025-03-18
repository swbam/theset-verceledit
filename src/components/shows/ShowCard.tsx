
import React from 'react';
import { Link } from 'react-router-dom';
import { Calendar, MapPin, Music } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
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
    <Link to={`/shows/${show.id}`}>
      <Card className="bg-[#111111]/80 border-white/10 overflow-hidden hover:border-white/30 transition duration-300 hover:scale-[1.02]">
        <div className="relative aspect-video overflow-hidden">
          {show.image_url ? (
            <img
              src={show.image_url}
              alt={show.name}
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
            <div className="flex items-center justify-end p-3">
              <div className="flex items-center bg-white/10 rounded-full px-2 py-0.5">
                <span className="text-white text-xs font-medium">
                  {Math.floor(Math.random() * 5000) + 500}
                </span>
              </div>
            </div>
          </div>
        </div>
        
        <CardContent className="p-4">
          <h3 className="font-bold text-lg mb-1 line-clamp-1">
            {tourName || show.name.split(' - ')[0]}
          </h3>
          
          <p className="text-white/70 text-sm mb-3 line-clamp-1">
            {show.artist?.name || 'Unknown Artist'}
          </p>
          
          <div className="flex flex-col space-y-2 text-sm text-white/60">
            <div className="flex items-center">
              <Calendar size={16} className="mr-2 flex-shrink-0" />
              <span>{formatDate(show.date, true)}</span>
            </div>
            
            {show.venue && (
              <div className="flex items-start">
                <MapPin size={16} className="mr-2 flex-shrink-0 mt-1" />
                <span className="line-clamp-2">
                  {show.venue.name}
                  {show.venue.city && `, ${show.venue.city}`}
                  {show.venue.state && `, ${show.venue.state}`}
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
};

export default ShowCard;
