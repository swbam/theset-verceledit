
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight, MapPin, CalendarDays } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { fetchShowsByGenre, popularMusicGenres } from '@/lib/ticketmaster';
import { Skeleton } from '@/components/ui/skeleton';

// Create a simplified genre list for the UI filter
const GENRES = [
  { id: "all", name: "All Genres" },
  ...popularMusicGenres.slice(0, 7).map(genre => ({
    id: genre.id,
    name: genre.name
  }))
];

const UpcomingShows = () => {
  const [activeGenre, setActiveGenre] = useState("all");
  
  // Fetch shows based on the selected genre
  const { data: shows = [], isLoading, error } = useQuery({
    queryKey: ['upcomingShows', activeGenre],
    queryFn: async () => {
      try {
        if (activeGenre === "all") {
          // For "All Genres", fetch the default (rock) shows
          return await fetchShowsByGenre(popularMusicGenres[0].id, 6);
        } else {
          // Fetch shows for the selected genre
          return await fetchShowsByGenre(activeGenre, 6);
        }
      } catch (error) {
        console.error("Error fetching upcoming shows:", error);
        return [];
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return (
    <section className="py-12 md:py-16 px-4 bg-[#0A0A10]">
      <div className="container mx-auto max-w-7xl">
        <div className="flex justify-between items-center mb-6 md:mb-8">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-white">Upcoming Shows</h2>
            <p className="text-sm md:text-base text-white/70 mt-1">
              Popular concerts coming up soon
            </p>
          </div>
          <Link to="/shows" className="text-white hover:text-white/80 font-medium flex items-center group">
            <span className="hidden sm:inline">View all</span> <ChevronRight size={16} className="ml-0 sm:ml-1 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
        
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
          {GENRES.map(genre => (
            <button
              key={genre.id}
              onClick={() => setActiveGenre(genre.id)}
              className={`whitespace-nowrap px-4 py-2 rounded-full text-sm ${
                activeGenre === genre.id
                  ? 'bg-white text-black font-medium'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              {genre.name}
            </button>
          ))}
        </div>
        
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="bg-black/40 border-white/10">
                <div className="p-4 border-b border-white/10">
                  <Skeleton className="h-5 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
                <div className="p-4 space-y-3">
                  <div className="flex items-center">
                    <Skeleton className="h-4 w-4 mr-2 rounded-full" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                  <div className="flex items-center">
                    <Skeleton className="h-4 w-4 mr-2 rounded-full" />
                    <Skeleton className="h-3 w-40" />
                  </div>
                </div>
                <Skeleton className="h-9 mx-4 mb-4 rounded" />
              </Card>
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-10 bg-black/20 rounded-lg border border-white/5">
            <p className="text-white/60">Failed to load upcoming shows</p>
            <Button 
              variant="outline" 
              className="mt-3"
              onClick={() => window.location.reload()}
            >
              Retry
            </Button>
          </div>
        ) : shows.length === 0 ? (
          <div className="text-center py-10 bg-black/20 rounded-lg border border-white/5">
            <p className="text-white/60">No upcoming shows found for this genre</p>
            <Button 
              variant="outline" 
              className="mt-3"
              onClick={() => setActiveGenre("all")}
            >
              Show all genres
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {shows.map(show => {
              // Format date string nicely
              const eventDate = show.date 
                ? new Date(show.date).toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric'
                  })
                : 'Date TBA';
                
              return (
                <Card key={show.id} className="bg-black/40 border-white/10 overflow-hidden hover:border-white/20 transition-all">
                  <Link to={`/shows/${show.id}`} className="block">
                    <div className="p-4 border-b border-white/10">
                      <h3 className="font-bold text-lg mb-1">{show.name}</h3>
                      <p className="text-sm text-white/80">{show.artist?.name || 'Various Artists'}</p>
                    </div>
                    <div className="p-4 space-y-2 text-sm">
                      <div className="flex items-center">
                        <CalendarDays className="h-4 w-4 mr-2 text-white/60" />
                        <span className="text-white/80">{eventDate}</span>
                      </div>
                      <div className="flex items-center">
                        <MapPin className="h-4 w-4 mr-2 text-white/60" />
                        <span className="text-white/80">
                          {show.venue?.name ? (
                            `${show.venue.name}, ${show.venue.city || ''} ${show.venue.state || ''}`
                          ) : (
                            'Venue TBA'
                          )}
                        </span>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" className="m-4">
                      View setlist
                    </Button>
                  </Link>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};

export default UpcomingShows;
