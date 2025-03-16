
import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ShowCard from '@/components/shows/ShowCard';

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

  // Determine which shows to display (max 3 in main view)
  const displayShows = shows.slice(0, 3);
  const hasMoreShows = shows.length > 3;

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
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayShows.map((show, index) => (
            <div 
              key={show.id} 
              className="animate-fade-in"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <ShowCard 
                show={{
                  id: show.id,
                  name: show.name,
                  date: show.date,
                  image_url: show.image_url,
                  venue: show.venue,
                  ticket_url: show.ticket_url,
                  artist: { name: artistName }
                }} 
              />
            </div>
          ))}
        </div>
        
        {hasMoreShows && (
          <div className="mt-8 text-center">
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
