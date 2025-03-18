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
  { id: "rock", name: "Rock" },
  { id: "pop", name: "Pop" },
  { id: "hip-hop", name: "Hip Hop" },
  { id: "electronic", name: "Electronic" },
  { id: "R&B", name: "R&B" },
  { id: "country", name: "Country" },
  { id: "latin", name: "Latin" },
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
    <section className="py-12 md:py-16 px-4 bg-black">
      <div className="container mx-auto max-w-7xl">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-2xl font-bold text-white">Upcoming Shows</h2>
            <p className="text-sm text-white/60 mt-1">Popular concerts coming up soon</p>
          </div>
          <Link to="/shows" className="text-white hover:text-white/80 flex items-center text-sm">
            View all <ChevronRight size={16} className="ml-1" />
          </Link>
        </div>
        
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
          {GENRES.map(genre => (
            <button
              key={genre.id}
              onClick={() => setActiveGenre(genre.id)}
              className={`whitespace-nowrap px-4 py-1.5 rounded-full text-sm border ${
                activeGenre === genre.id
                  ? 'bg-white text-black border-white'
                  : 'bg-transparent text-white border-white/20 hover:border-white/40'
              }`}
            >
              {genre.name}
            </button>
          ))}
        </div>
        
        {isLoading ? (
          <div className="grid grid-cols-1 divide-y divide-white/10 animate-pulse">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="py-4">
                <div className="h-5 w-1/3 bg-white/5 rounded mb-2"></div>
                <div className="h-4 w-1/2 bg-white/5 rounded mb-2"></div>
                <div className="h-3 w-1/4 bg-white/5 rounded"></div>
              </div>
            ))}
          </div>
        ) : shows.length === 0 ? (
          <div className="text-center py-10 border border-white/10 rounded-lg">
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-0">
            {shows.slice(0, 6).map((show) => {
              // Format date string nicely
              const eventDate = show.date 
                ? new Date(show.date).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  })
                : 'Date TBA';
                
              return (
                <div key={show.id} className="border-b border-white/10 py-4">
                  <Link to={`/shows/${show.id}`} className="block hover:opacity-80 transition-opacity">
                    <div className="flex flex-col">
                      <div className="text-xs text-white/60 font-medium">
                        {show.artist?.name || 'Various Artists'}
                      </div>
                      <h3 className="font-bold text-lg text-white mb-1">
                        {show.name}
                      </h3>
                      <div className="flex items-center text-xs text-white/60">
                        <CalendarDays className="h-3 w-3 mr-1" />
                        {eventDate}
                        <span className="mx-2">•</span>
                        <MapPin className="h-3 w-3 mr-1" />
                        {show.venue?.name ? (
                          `${show.venue.name}, ${show.venue.city || ''}`
                        ) : (
                          'Venue TBA'
                        )}
                      </div>
                    </div>
                  </Link>
                  <div className="mt-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="text-xs h-7 px-3 rounded-full border-white/20 hover:border-white/40"
                      asChild
                    >
                      <Link to={`/shows/${show.id}`}>View details</Link>
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};

export default UpcomingShows;
