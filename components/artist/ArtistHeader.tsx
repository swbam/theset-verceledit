import Image from 'next/image';
import { CalendarRange } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Artist {
  id: string;
  name: string;
  image_url: string | null;
  genres?: string[];
}

interface ArtistHeaderProps {
  artist: Artist;
  upcomingShowsCount: number;
}

export default function ArtistHeader({ artist, upcomingShowsCount }: ArtistHeaderProps) {
  return (
    <div className="flex flex-col md:flex-row gap-6 items-start">
      <div className="relative w-32 h-32 md:w-40 md:h-40 rounded-xl overflow-hidden shrink-0 bg-muted">
        {artist.image_url ? (
          <Image
            src={artist.image_url}
            alt={artist.name}
            fill
            className="object-cover"
            priority
            sizes="(max-width: 768px) 128px, 160px"
          />
        ) : (
          <div className="flex items-center justify-center h-full w-full bg-muted text-muted-foreground">
            No Image
          </div>
        )}
      </div>
      
      <div className="flex flex-col space-y-4 flex-1">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">{artist.name}</h1>
          
          {artist.genres && artist.genres.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-2">
              {artist.genres.slice(0, 3).map(genre => (
                <span 
                  key={genre} 
                  className="inline-block px-2 py-1 text-xs bg-muted rounded-full"
                >
                  {genre}
                </span>
              ))}
              {artist.genres.length > 3 && (
                <span className="inline-block px-2 py-1 text-xs text-muted-foreground">
                  +{artist.genres.length - 3} more
                </span>
              )}
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-4 flex-wrap">
          {upcomingShowsCount > 0 ? (
            <Button 
              variant="outline" 
              className="gap-2"
              asChild
            >
              <a href="#upcoming-shows">
                <CalendarRange className="h-4 w-4" />
                <span>{upcomingShowsCount} upcoming {upcomingShowsCount === 1 ? 'show' : 'shows'}</span>
              </a>
            </Button>
          ) : (
            <div className="text-sm text-muted-foreground flex items-center gap-2">
              <CalendarRange className="h-4 w-4" />
              <span>No upcoming shows</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 