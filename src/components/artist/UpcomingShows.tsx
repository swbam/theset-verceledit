
import React from 'react';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ShowCard from '@/components/shows/ShowCard';

interface UpcomingShowsProps {
  shows: any[];
  artistName: string;
}

const UpcomingShows = ({ shows, artistName }: UpcomingShowsProps) => {
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
              <a href="/artists">Discover other artists</a>
            </Button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="px-6 md:px-8 lg:px-12 py-12 bg-secondary/50">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between mb-8">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold">Upcoming Shows</h2>
            <p className="text-muted-foreground mt-1">Vote on setlists for upcoming shows</p>
          </div>
          
          {shows.length > 3 && (
            <Button variant="ghost" className="mt-4 md:mt-0 group">
              <div className="flex items-center">
                See all shows
                <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </div>
            </Button>
          )}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {shows.map((show, index) => (
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
                  artist: { name: artistName }
                }} 
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default UpcomingShows;
