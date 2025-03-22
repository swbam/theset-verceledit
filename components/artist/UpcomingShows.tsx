import { CalendarIcon, MapPinIcon, ExternalLinkIcon } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';

interface Show {
  id: string;
  date: string;
  venue: string;
  city: string;
  ticket_url?: string | null;
}

interface UpcomingShowsProps {
  shows: Show[];
  artistName: string;
  isLoading: boolean;
}

export default function UpcomingShows({ shows, artistName, isLoading }: UpcomingShowsProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="overflow-hidden">
            <CardContent className="p-0">
              <div className="p-4 flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-6 w-32" />
                  <Skeleton className="h-4 w-48" />
                </div>
                <Skeleton className="h-10 w-24" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (shows.length === 0) {
    return (
      <Card className="bg-muted/50">
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground">No upcoming shows for {artistName}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3" id="upcoming-shows">
      {shows.map((show) => (
        <Card key={show.id} className="overflow-hidden">
          <CardContent className="p-0">
            <div className="p-4 flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">
                    {format(new Date(show.date), 'EEEE, MMMM do, yyyy')}
                  </span>
                  
                  {isShowSoon(show.date) && (
                    <Badge variant="secondary" className="ml-2">
                      {getDaysUntilShow(show.date)}
                    </Badge>
                  )}
                </div>
                
                <div className="flex items-center gap-2">
                  <MapPinIcon className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {show.venue}, {show.city}
                  </span>
                </div>
              </div>
              
              {show.ticket_url && (
                <Button 
                  size="sm" 
                  className="whitespace-nowrap"
                  asChild
                >
                  <a 
                    href={show.ticket_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-2"
                  >
                    <span>Get Tickets</span>
                    <ExternalLinkIcon className="h-3 w-3" />
                  </a>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// Helper functions
function isShowSoon(dateString: string): boolean {
  const showDate = new Date(dateString);
  const now = new Date();
  const diffInDays = Math.ceil((showDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  return diffInDays <= 14; // Show badge for shows within next 14 days
}

function getDaysUntilShow(dateString: string): string {
  const showDate = new Date(dateString);
  const now = new Date();
  const diffInDays = Math.ceil((showDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  
  if (diffInDays === 0) {
    return 'Today';
  } else if (diffInDays === 1) {
    return 'Tomorrow';
  } else {
    return `${diffInDays} days`;
  }
} 