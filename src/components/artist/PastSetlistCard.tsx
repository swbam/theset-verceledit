import React from 'react';
import { Link } from 'react-router-dom';
import { Calendar, MapPin, ChevronRight, Music } from 'lucide-react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface PastSetlistCardProps {
  setlist: {
    id: string;
    date: string;
    venue: {
      name: string;
      city: string;
      state?: string;
    };
    songs: string[];
  };
  className?: string;
}

const PastSetlistCard = ({ setlist, className }: PastSetlistCardProps) => {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    }).format(date);
  };

  return (
    <Card className={cn(
      "bg-zinc-900/50 border-zinc-800/50 overflow-hidden hover:border-zinc-700/50 transition-all",
      className
    )}>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-zinc-400 mb-3 text-sm">
          <Calendar className="h-4 w-4" />
          <span className="font-medium">{formatDate(setlist.date)}</span>
        </div>
        
        <h3 className="text-lg font-semibold mb-1">{setlist.venue.name}</h3>
        
        <div className="flex items-center text-sm text-zinc-400 mb-4">
          <MapPin className="h-3.5 w-3.5 mr-1.5 flex-shrink-0" />
          <span>
            {setlist.venue.city}
            {setlist.venue.state && `, ${setlist.venue.state}`}
          </span>
        </div>
        
        <div className="mt-4">
          <div className="flex items-center gap-2 mb-2">
            <Music className="h-4 w-4 text-zinc-400" />
            <h4 className="text-sm font-medium">Top songs played</h4>
          </div>
          
          <div className="flex flex-wrap gap-2 mt-1">
            {setlist.songs.map((song, idx) => (
              <Badge 
                key={idx} 
                variant="secondary" 
                className="bg-zinc-800/70 hover:bg-zinc-800 text-zinc-300"
              >
                {song}
              </Badge>
            ))}
          </div>
        </div>
      </CardContent>
      
      <CardFooter className="px-4 py-3 bg-zinc-950/30 border-t border-zinc-800/50">
        <Button 
          variant="ghost" 
          size="sm" 
          className="w-full justify-between text-zinc-400 hover:text-white"
          asChild
        >
          <Link to={`/shows/${setlist.id}`}>
            View full setlist
            <ChevronRight className="h-4 w-4" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
};

export default PastSetlistCard; 