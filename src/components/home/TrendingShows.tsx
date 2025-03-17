
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Calendar, MapPin } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { fetchFeaturedShows } from '@/lib/ticketmaster';

const TrendingShows = () => {
  const { data: showsData = [], isLoading, error } = useQuery({
    queryKey: ['trendingShows'],
    queryFn: () => fetchFeaturedShows(8), // Fetch more to ensure we have enough after deduplication
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

  const getGenreLabel = (show: any) => {
    if (show.artist?.genres?.length) {
      return show.artist.genres[0];
    }
    return "Pop"; // Fallback genre
  };

  // Ensure unique shows by ID
  const uniqueShows = React.useMemo(() => {
    const uniqueMap = new Map();
    
    showsData.forEach(show => {
      if (!uniqueMap.has(show.id)) {
        uniqueMap.set(show.id, show);
      }
    });

    return Array.from(uniqueMap.values()).slice(0, 4);
  }, [showsData]);

  return (
    <section className="py-16 px-4">
      <div className="container mx-auto max-w-5xl">
        <div className="section-header">
          <div>
            <h2 className="section-title">Trending Shows</h2>
            <p className="section-subtitle">Shows with the most active voting right now</p>
          </div>
          <Link to="/shows" className="view-all-button">
            View all →
          </Link>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, index) => (
              <div key={index} className="bg-black/20 border border-white/10 rounded-lg overflow-hidden">
                <Skeleton className="aspect-square w-full" />
                <div className="p-4">
                  <Skeleton className="h-4 w-3/4 mb-2" />
                  <Skeleton className="h-3 w-1/2 mb-3" />
                  <div className="flex items-center mb-2">
                    <Skeleton className="h-3 w-3 rounded-full mr-2" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                  <div className="flex items-center">
                    <Skeleton className="h-3 w-3 rounded-full mr-2" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-10">
            <p className="text-white/60">Unable to load trending shows</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {uniqueShows.map((show, index) => {
              const formattedDate = formatDate(show.date);
              const genre = getGenreLabel(show);
              
              return (
                <Link 
                  key={show.id} 
                  to={`/shows/${show.id}`}
                  className="bg-black/20 border border-white/10 rounded-lg overflow-hidden hover:border-white/30 transition-all hover:scale-[1.02]"
                >
                  <div className="relative aspect-square overflow-hidden">
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
                    <div className="absolute top-2 right-2 bg-black/60 px-2 py-1 rounded text-xs">
                      {genre}
                    </div>
                    <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black to-transparent pt-10 pb-2 px-3">
                      <div className="text-xs font-medium text-white/80 flex items-center">
                        <span className="bg-white/20 text-white text-xs px-2 py-0.5 rounded">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <span key={i} className="text-xs">★</span>
                          ))}
                        </span>
                        <span className="ml-1">{Math.floor(Math.random() * 3000) + 500}</span>
                      </div>
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="font-bold text-sm text-left mb-1 line-clamp-1">{show.name}</h3>
                    <p className="text-white/70 text-xs text-left mb-3 line-clamp-1">{show.artist?.name || 'Unknown Artist'}</p>
                    <div className="flex items-center text-xs text-white/60 mb-2 text-left">
                      <Calendar className="h-3 w-3 mr-2" />
                      <span>
                        {typeof formattedDate === 'object' 
                          ? `${formattedDate.month} ${formattedDate.day}, ${formattedDate.year}` 
                          : formattedDate}
                      </span>
                    </div>
                    <div className="flex items-center text-xs text-white/60 text-left">
                      <MapPin className="h-3 w-3 mr-2" />
                      <span className="line-clamp-1">
                        {show.venue 
                          ? `${show.venue.name}, ${show.venue.city || ''}` 
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

export default TrendingShows;
