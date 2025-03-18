import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import ShowCard from './ShowCard';

interface UpcomingShowsProps {
  shows: any[];
  artistName: string;
}

const UpcomingShows = ({ shows, artistName }: UpcomingShowsProps) => {
  // If no shows, display a message
  if (shows.length === 0) {
    return (
      <div className="text-center p-8 border border-zinc-800 rounded-lg bg-zinc-900/50">
        <p className="text-lg mb-4 text-white">No upcoming concerts found for this artist.</p>
        <Button variant="outline" asChild>
          <Link to="/shows">Discover other shows</Link>
        </Button>
      </div>
    );
  }

  // Display the shows in a grid
  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {shows.map((show) => (
          <ShowCard key={show.id} show={show} />
        ))}
      </div>
      
      {shows.length > 5 && (
        <div className="text-right mt-6">
          <Button variant="link" asChild>
            <Link to={`/shows?artist=${encodeURIComponent(artistName)}`}>
              See all {shows.length} shows
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
};

export default UpcomingShows;
