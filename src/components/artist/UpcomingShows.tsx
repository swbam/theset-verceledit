
import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Calendar, MapPin, ExternalLink, Clock, Music, Ticket } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/lib/api/mock-service';
import { Badge } from '@/components/ui/badge';

interface UpcomingShowsProps {
  shows: any[];
  artistName: string;
}

const UpcomingShows = ({ shows, artistName }: UpcomingShowsProps) => {
  // If no shows, display a message
  if (!shows.length) {
    return (
      <section className="px-6 md:px-8 lg:px-12 py-12 bg-secondary/50">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between mb-8">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold">Upcoming Shows</h2>
              <p className="text-muted-foreground mt-1">No upcoming shows found for {artistName}</p>
            </div>
          </div>
          
          <div className="text-center p-10 border border-border rounded-xl bg-background">
            <p className="text-lg mb-4">No upcoming concerts found for this artist.</p>
            <Button variant="outline" asChild>
              <Link to="/artists">Discover other artists</Link>
            </Button>
          </div>
        </div>
      </section>
    );
  }

  // Determine which shows to display (max 5 in main view)
  const displayShows = shows.slice(0, 5);
  const hasMoreShows = shows.length > 5;

  return (
    <section className="px-6 md:px-8 lg:px-12 py-12 bg-secondary/50">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between mb-8">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold">Upcoming Shows</h2>
            <p className="text-muted-foreground mt-1">Vote on setlists for upcoming shows</p>
          </div>
          
          {hasMoreShows && (
            <Button variant="ghost" className="mt-4 md:mt-0 group" asChild>
              <Link to={`/shows?artist=${encodeURIComponent(artistName)}`} className="flex items-center">
                See all {shows.length} shows
                <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </Button>
          )}
        </div>
        
        <div className="bg-background border border-border rounded-lg overflow-hidden">
          <div className="hidden md:grid md:grid-cols-[1fr_1fr_auto] lg:grid-cols-[1fr_1fr_1fr_auto] text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-3 bg-secondary/30 border-b border-border">
            <div>Date & Time</div>
            <div>Venue</div>
            <div className="hidden lg:block">Location</div>
            <div className="text-right">Actions</div>
          </div>
          
          {displayShows.map((show, index) => (
            <div 
              key={show.id}
              className={`grid md:grid-cols-[1fr_1fr_auto] lg:grid-cols-[1fr_1fr_1fr_auto] gap-4 p-4 md:p-6 border-b border-border/50 hover:bg-secondary/20 transition-colors ${
                index % 2 === 1 ? 'bg-secondary/5' : ''
              }`}
            >
              {/* Date & Time */}
              <div className="flex flex-col">
                <div className="md:hidden text-xs text-muted-foreground uppercase font-medium mb-1">Date & Time</div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-primary" />
                  <span className="font-medium">{formatDate(show.date, false)}</span>
                </div>
                {show.time && (
                  <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>{show.time}</span>
                  </div>
                )}
              </div>
              
              {/* Venue */}
              <div className="flex flex-col">
                <div className="md:hidden text-xs text-muted-foreground uppercase font-medium mb-1">Venue</div>
                <div className="font-medium">
                  {show.venue?.name || "Venue TBA"}
                </div>
              </div>
              
              {/* Location */}
              <div className="flex flex-col hidden lg:block">
                <div className="lg:hidden text-xs text-muted-foreground uppercase font-medium mb-1">Location</div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  <span>
                    {show.venue?.city || ""}
                    {show.venue?.state && show.venue?.city ? `, ${show.venue.state}` : show.venue?.state || ""}
                  </span>
                </div>
              </div>
              
              {/* Actions */}
              <div className="flex items-center justify-end gap-2">
                <Button variant="outline" size="sm" asChild>
                  <Link to={`/shows/${show.id}`} className="flex items-center gap-1.5">
                    <Music className="h-4 w-4" />
                    Setlist
                  </Link>
                </Button>
                
                {show.ticket_url && (
                  <Button variant="ghost" size="sm" asChild>
                    <a 
                      href={show.ticket_url} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="flex items-center gap-1.5"
                    >
                      <Ticket className="h-4 w-4" />
                      Tickets
                    </a>
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
        
        {hasMoreShows && (
          <div className="mt-6 text-center">
            <Button variant="outline" asChild>
              <Link to={`/shows?artist=${encodeURIComponent(artistName)}`} className="flex items-center gap-2 mx-auto w-fit">
                <Calendar size={16} />
                View all {shows.length} upcoming shows
              </Link>
            </Button>
          </div>
        )}
      </div>
    </section>
  );
};

export default UpcomingShows;
