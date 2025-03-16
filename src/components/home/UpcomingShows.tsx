
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Calendar, MapPin } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { fetchShowsByGenre, popularMusicGenres } from '@/lib/ticketmaster';

const UpcomingShows = () => {
  const [activeGenre, setActiveGenre] = useState("all");
  
  const { data: shows = [], isLoading, error } = useQuery({
    queryKey: ['upcomingShows', activeGenre],
    queryFn: () => {
      if (activeGenre === "all") {
        return fetchShowsByGenre(popularMusicGenres[0].id, 3); // Default to first genre
      }
      return fetchShowsByGenre(activeGenre, 3);
    },
  });

  // Format date helper function
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return {
        day: date.getDate(),
        month: date.toLocaleDateString('en-US', { month: 'short' }),
        year: date.getFullYear()
      };
    } catch (error) {
      return { day: "TBA", month: "", year: "" };
    }
  };

  return (
    <section className="py-16 px-4">
      <div className="container mx-auto max-w-5xl">
        <div className="section-header">
          <div>
            <h2 className="section-title">Upcoming Shows</h2>
            <p className="section-subtitle">Browse and vote on setlists for upcoming concerts</p>
          </div>
          <Link to="/shows" className="view-all-button">
            View all →
          </Link>
        </div>
        
        <div className="flex flex-wrap gap-2 mb-6">
          <button
            onClick={() => setActiveGenre("all")}
            className={`genre-pill ${activeGenre === "all" ? "bg-white/20 border-white/30" : ""}`}
          >
            All Genres
          </button>
          {popularMusicGenres.slice(0, 6).map(genre => (
            <button
              key={genre.id}
              onClick={() => setActiveGenre(genre.id)}
              className={`genre-pill ${activeGenre === genre.id ? "bg-white/20 border-white/30" : ""}`}
            >
              {genre.name}
            </button>
          ))}
        </div>
        
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[...Array(3)].map((_, index) => (
              <div key={index} className="bg-black/20 border border-white/10 rounded-lg overflow-hidden">
                <Skeleton className="aspect-[16/9] w-full" />
                <div className="p-4">
                  <Skeleton className="h-5 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-1/2 mb-3" />
                  <div className="flex items-center mb-2">
                    <Skeleton className="h-4 w-4 rounded-full mr-2" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                  <div className="flex items-center">
                    <Skeleton className="h-4 w-4 rounded-full mr-2" />
                    <Skeleton className="h-4 w-full" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-10">
            <p className="text-white/60">Unable to load upcoming shows</p>
          </div>
        ) : shows.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-white/60">No upcoming shows found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {shows.map(show => {
              const formattedDate = formatDate(show.date);
              
              return (
                <Link 
                  key={show.id} 
                  to={`/shows/${show.id}`}
                  className="bg-black/20 border border-white/10 rounded-lg overflow-hidden hover:border-white/30 transition-all hover:scale-[1.01]"
                >
                  <div className="relative aspect-[16/9] overflow-hidden">
                    {show.image_url ? (
                      <img 
                        src={show.image_url} 
                        alt={show.name} 
                        className="object-cover w-full h-full"
                      />
                    ) : (
                      <div className="bg-secondary/20 w-full h-full flex items-center justify-center">
                        <span className="text-white/40">No image</span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                    <div className="absolute bottom-0 inset-x-0 p-4">
                      <h3 className="text-white font-bold text-lg line-clamp-1">{show.name}</h3>
                      <p className="text-white/90 text-sm">{show.artist?.name || 'Unknown Artist'}</p>
                    </div>
                  </div>
                  
                  <div className="p-4">
                    <div className="flex items-center text-sm text-white/80 mb-2">
                      <Calendar className="h-4 w-4 mr-2" />
                      <span>
                        {typeof formattedDate === 'object' 
                          ? `${formattedDate.month} ${formattedDate.day}, ${formattedDate.year}` 
                          : formattedDate}
                      </span>
                    </div>
                    <div className="flex items-center text-sm text-white/80">
                      <MapPin className="h-4 w-4 mr-2" />
                      <span className="line-clamp-1">
                        {show.venue 
                          ? `${show.venue.name}, ${show.venue.city || ''}${show.venue.state ? `, ${show.venue.state}` : ''}` 
                          : 'Venue TBA'}
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};

export default UpcomingShows;
