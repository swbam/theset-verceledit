
import React from 'react';
import { Link } from 'react-router-dom';
import { Calendar, MapPin, Music, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
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
              <Link to="/shows">Discover other shows</Link>
            </Button>
          </div>
        </div>
      </section>
    );
  }

  // Display shows in a grid layout
  return (
    <section className="px-6 md:px-8 lg:px-12 py-12 app-gradient bg-gray-950">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between mb-8">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-white">Upcoming Shows</h2>
            <p className="text-white/70 mt-1">Vote on setlists for upcoming shows</p>
          </div>
          
          {shows.length > 4 && (
            <Button variant="ghost" className="mt-4 md:mt-0 group text-white hover:text-white hover:bg-white/5" asChild>
              <Link to={`/shows?artist=${encodeURIComponent(artistName)}`} className="flex items-center">
                See all {shows.length} shows
                <ArrowRight className="ml-1.5 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </Button>
          )}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {shows.slice(0, 8).map((show) => (
            <Link 
              key={show.id} 
              to={`/shows/${show.id}`}
              className="block group"
            >
              <Card className="border-white/10 bg-black/30 hover:bg-black/40 hover:border-white/20 transition-all h-full">
                <div className="p-5 flex flex-col h-full">
                  <div className="flex items-center mb-3">
                    <Calendar className="h-5 w-5 text-white/70 mr-2" />
                    <span className="text-white font-medium">
                      {formatDate(show.date, false)}
                    </span>
                  </div>
                  
                  <h3 className="font-bold text-white text-lg mb-2 line-clamp-1">
                    {show.venue?.name || "Venue TBA"}
                  </h3>
                  
                  <div className="flex items-start mb-auto text-white/70 pb-3">
                    <MapPin className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
                    <span>
                      {show.venue?.city || ""}
                      {show.venue?.state && show.venue?.city ? `, ${show.venue.state}` : show.venue?.state || ""}
                    </span>
                  </div>
                  
                  <Button 
                    variant="outline" 
                    className="w-full border-white/10 bg-white/5 text-white hover:bg-white/10 group-hover:border-white/20 mt-2"
                  >
                    <Music className="h-4 w-4 mr-2" />
                    View Setlist
                  </Button>
                </div>
              </Card>
            </Link>
          ))}
        </div>
        
        {shows.length > 8 && (
          <div className="mt-6 text-center">
            <Button variant="outline" className="border-white/10 bg-white/5 text-white hover:bg-white/10" asChild>
              <Link to={`/shows?artist=${encodeURIComponent(artistName)}`} className="flex items-center gap-2 mx-auto w-fit">
                <Calendar size={16} />
                See all {shows.length} shows
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </div>
        )}
      </div>
    </section>
  );
};

export default UpcomingShows;
