import React from 'react';
import { Link } from 'react-router-dom';
import { Calendar, MapPin } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { format, parseISO } from 'date-fns';
import { generateShowUrl } from '@/lib/utils';

interface ShowCardProps {
  show: {
    id: string;
    name: string;
    date: string;
    image_url?: string;
    venue?: {
      name: string;
      city?: string;
      state?: string;
    };
    artist?: {
      name: string;
      image_url?: string;
      genres?: string[];
    };
    genre?: string;
  };
}

export default function ShowCard({ show }: ShowCardProps) {
  // Format date if it exists
  const formattedDate = show.date ? format(parseISO(show.date), 'EEE, MMM d, yyyy • h:mm a') : 'Date TBA';
  
  // Extract artist name from show name if not provided
  const artistName = show.artist?.name || show.name.split(' - ')[0].trim();
  
  // Get genre from artist or show
  const genre = show.genre || show.artist?.genres?.[0] || 'Music';
  
  // Get venue details
  const venueText = show.venue 
    ? `${show.venue.name}${show.venue.city ? `, ${show.venue.city}` : ''}${show.venue.state ? `, ${show.venue.state}` : ''}`
    : 'Venue TBA';

  // Generate SEO-friendly URL
  const showUrl = generateShowUrl({
    artistName,
    cityName: show.venue?.city || 'TBA',
    date: show.date,
    showId: show.id
  });

  return (
    <Link to={showUrl}>
      <Card className="h-full bg-[#111111]/80 border-white/10 overflow-hidden hover:border-white/30 transition duration-200 hover:translate-y-[-2px]">
        {/* Image section */}
        <div className="relative aspect-[16/9] overflow-hidden">
          {show.image_url ? (
            <img 
              src={show.image_url} 
              alt={show.name}
              className="object-cover w-full h-full"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-[#222]">
              <Calendar className="h-10 w-10 text-white/40" />
            </div>
          )}
          <Badge 
            className="absolute top-3 right-3 bg-black/60 hover:bg-black/60 text-white"
          >
            {genre}
          </Badge>
        </div>
        
        {/* Content section */}
        <CardContent className="p-4">
          <h3 className="font-bold text-lg mb-1 line-clamp-1">
            {show.name}
          </h3>
          <p className="text-white/70 text-sm font-medium mb-3">
            {artistName}
          </p>
          
          <div className="flex flex-col space-y-2 text-sm text-white/60">
            <div className="flex items-center">
              <Calendar size={14} className="min-w-[14px] mr-2" />
              <span className="line-clamp-1">{formattedDate}</span>
            </div>
            
            <div className="flex items-start">
              <MapPin size={14} className="min-w-[14px] mr-2 mt-1" />
              <span className="line-clamp-1">
                {venueText}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
