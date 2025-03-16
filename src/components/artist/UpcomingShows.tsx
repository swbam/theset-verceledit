
import React from 'react';
import { Link } from 'react-router-dom';
import { Calendar, MapPin, Music, Ticket } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { formatDate } from '@/lib/api/mock-service';

interface UpcomingShowsProps {
  shows: any[];
  artistName: string;
}

const UpcomingShows = ({
  shows,
  artistName
}: UpcomingShowsProps) => {
  // If no shows, display a message
  if (!shows.length) {
    return (
      <section className="px-6 md:px-8 lg:px-12 py-12 app-gradient">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between mb-8">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-white">Upcoming Shows</h2>
              <p className="text-white/70 mt-1">No upcoming shows found for {artistName}</p>
            </div>
          </div>
          
          <div className="text-center p-10 border border-white/10 rounded-xl card-gradient">
            <p className="text-lg mb-4 text-white">No upcoming concerts found for this artist.</p>
            <Button variant="outline" className="border-white/20 bg-white/5 text-white hover:bg-white/10" asChild>
              <Link to="/artists">Discover other artists</Link>
            </Button>
          </div>
        </div>
      </section>
    );
  }

  // All shows should be displayed in the card layout
  return (
    <section className="px-6 md:px-8 lg:px-12 py-12 app-gradient bg-gray-950">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between mb-8">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-white">Upcoming Shows</h2>
            <p className="text-white/70 mt-1">Vote on setlists for upcoming shows</p>
          </div>
          
          {shows.length > 5 && (
            <Button variant="ghost" className="mt-4 md:mt-0 group text-white hover:text-white hover:bg-white/5" asChild>
              <Link to={`/shows?artist=${encodeURIComponent(artistName)}`} className="flex items-center">
                See all {shows.length} shows
                <span className="ml-1 transition-transform group-hover:translate-x-1">→</span>
              </Link>
            </Button>
          )}
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {shows.map((show) => (
            <Card 
              key={show.id} 
              className="border-white/10 bg-black/30 overflow-hidden hover:border-white/30 transition-all"
            >
              <CardContent className="p-0">
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Calendar className="h-4 w-4 text-blue-400" />
                    <span className="font-medium text-white">{formatDate(show.date, false)}</span>
                  </div>
                  
                  <h3 className="font-medium text-white mb-2 line-clamp-1">
                    {show.venue?.name || "Venue TBA"}
                  </h3>
                  
                  <div className="flex items-center gap-2 text-white/60 mb-4">
                    <MapPin className="h-4 w-4" />
                    <span className="line-clamp-1">
                      {show.venue?.city || ""}
                      {show.venue?.state && show.venue?.city ? `, ${show.venue.state}` : show.venue?.state || ""}
                    </span>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-2 mt-auto">
                    <Button variant="outline" size="sm" className="border-white/10 bg-white/5 text-white hover:bg-white/10 w-full" asChild>
                      <Link to={`/shows/${show.id}`} className="flex items-center justify-center gap-1.5">
                        <Music className="h-4 w-4" />
                        View Setlist
                      </Link>
                    </Button>
                    
                    {show.ticket_url && (
                      <Button variant="default" size="sm" className="w-full" asChild>
                        <a href={show.ticket_url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-1.5">
                          <Ticket className="h-4 w-4" />
                          Tickets
                        </a>
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        
        {shows.length > 4 && (
          <div className="mt-6 text-center">
            <Button variant="outline" className="border-white/10 bg-white/5 text-white hover:bg-white/10" asChild>
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
