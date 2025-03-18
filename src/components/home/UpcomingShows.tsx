import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { fetchUpcomingShows } from '@/lib/ticketmaster';

const GENRES = [
  { id: 'all', name: 'All Genres' },
  { id: 'pop', name: 'Pop' },
  { id: 'rock', name: 'Rock' },
  { id: 'hip-hop', name: 'Hip Hop' },
  { id: 'electronic', name: 'Electronic' },
  { id: 'rnb', name: 'R&B' },
  { id: 'country', name: 'Country' },
  { id: 'latin', name: 'Latin' },
];

const UpcomingShows = () => {
  const [selectedGenre, setSelectedGenre] = useState('all');
  
  const { data: upcomingShows = [], isLoading } = useQuery({
    queryKey: ['upcomingShows', selectedGenre],
    queryFn: () => fetchUpcomingShows(selectedGenre !== 'all' ? selectedGenre : undefined),
  });

  return (
    <section className="py-10 px-4">
      <div className="container mx-auto max-w-7xl">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold">Upcoming Shows</h2>
            <p className="text-white/60 text-sm hidden md:block">Vote on setlists for these upcoming concerts</p>
          </div>
          
          <Link to="/shows" className="group inline-flex items-center mt-2 md:mt-0">
            <span className="text-sm font-medium mr-1">View all</span>
            <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>
        
        <div className="overflow-x-auto pb-2 mb-6">
          <div className="flex space-x-2 min-w-max">
            {GENRES.map((genre) => (
              <Button
                key={genre.id}
                variant={selectedGenre === genre.id ? "default" : "outline"}
                size="sm"
                className={`rounded-full text-xs px-4 h-8 ${
                  selectedGenre === genre.id 
                    ? "" 
                    : "bg-zinc-900 hover:bg-zinc-800 border-zinc-800"
                }`}
                onClick={() => setSelectedGenre(genre.id)}
              >
                {genre.name}
              </Button>
            ))}
          </div>
        </div>
        
        {isLoading ? (
          <div className="space-y-4">
            {Array(5).fill(0).map((_, i) => (
              <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 animate-pulse">
                <div className="flex flex-col md:flex-row md:items-center">
                  <div className="w-full md:w-3/5 mb-2 md:mb-0">
                    <div className="h-5 bg-zinc-800 rounded w-1/3 mb-2"></div>
                    <div className="h-4 bg-zinc-800 rounded w-2/3"></div>
                  </div>
                  <div className="w-full md:w-2/5 flex justify-between mt-3 md:mt-0">
                    <div className="h-8 bg-zinc-800 rounded w-24"></div>
                    <div className="h-8 bg-zinc-800 rounded w-24"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : upcomingShows.length > 0 ? (
          <div className="space-y-4">
            {upcomingShows.map((show) => (
              <div key={show.id} className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
                <div className="flex flex-col md:flex-row md:items-center">
                  <div className="w-full md:w-3/5 mb-3 md:mb-0">
                    <h3 className="font-medium text-white">
                      {show.name || show.artist?.name}
                    </h3>
                    <p className="text-white/60 text-sm mt-1">
                      {new Date(show.date).toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric', 
                        year: 'numeric' 
                      })} • {show.venue?.name || 'Unknown venue'}, {show.venue?.city || ''}{show.venue?.state ? `, ${show.venue.state}` : ''}
                    </p>
                  </div>
                  <div className="w-full md:w-2/5 flex justify-between md:justify-end md:space-x-3">
                    <Button asChild variant="outline" size="sm" className="w-full md:w-auto">
                      <Link to={`/shows/${show.id}`}>View Setlist</Link>
                    </Button>
                    {show.ticket_url && (
                      <Button asChild variant="default" size="sm" className="w-full md:w-auto">
                        <a href={show.ticket_url} target="_blank" rel="noopener noreferrer">
                          Tickets
                        </a>
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-10 bg-zinc-900 rounded-lg border border-zinc-800">
            <p className="text-white/60">No upcoming shows found</p>
          </div>
        )}
      </div>
    </section>
  );
};

export default UpcomingShows;
