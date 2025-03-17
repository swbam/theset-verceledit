
import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Calendar, MapPin, ChevronRight, Flame } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { fetchFeaturedShows } from '@/lib/ticketmaster';
import { toast } from 'sonner';

const TrendingShows = () => {
  const { data: showsData = [], isLoading, error } = useQuery({
    queryKey: ['trendingShows'],
    queryFn: async () => {
      try {
        // Fetch more shows to filter out the highest quality ones
        const shows = await fetchFeaturedShows(12);
        
        // Sort shows by a popularity metric (voting activity)
        return shows
          .map(show => ({
            ...show,
            // Generate a weighted popularity score for each show
            popularityScore: Math.floor(Math.random() * 5000) + 2000 // Simulating for demo purposes
          }))
          .sort((a, b) => b.popularityScore - a.popularityScore)
          .slice(0, 4); // Take only the top 4 trending shows
      } catch (error) {
        console.error("Failed to fetch trending shows:", error);
        toast.error("Couldn't load trending shows");
        return [];
      }
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

  // Ensure unique shows by ID and only use the top 4
  const uniqueShows = React.useMemo(() => {
    const uniqueMap = new Map();
    
    showsData.forEach(show => {
      if (!uniqueMap.has(show.id)) {
        uniqueMap.set(show.id, show);
      }
    });

    return Array.from(uniqueMap.values());
  }, [showsData]);

  return (
    <section className="py-12 md:py-16 px-4 bg-[#0A0A10]">
      <div className="container mx-auto max-w-7xl">
        <div className="flex justify-between items-center mb-6 md:mb-8">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl md:text-3xl font-bold text-white">Trending Shows</h2>
              <Flame className="h-5 w-5 text-orange-500" />
            </div>
            <p className="text-sm md:text-base text-white/70 mt-1">Hottest shows with active voting right now</p>
          </div>
          <Link to="/shows" className="text-white hover:text-white/80 font-medium flex items-center group">
            <span className="hidden sm:inline">View all</span> <ChevronRight size={16} className="ml-0 sm:ml-1 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
        
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            {[...Array(4)].map((_, index) => (
              <div key={index} className="bg-black/40 rounded-lg overflow-hidden border border-white/10">
                <Skeleton className="aspect-[4/3] w-full" />
                <div className="p-4">
                  <Skeleton className="h-5 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-1/2 mb-3" />
                  <div className="flex items-center mb-2">
                    <Skeleton className="h-4 w-4 rounded-full mr-2" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                  <div className="flex items-center">
                    <Skeleton className="h-4 w-4 rounded-full mr-2" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-10 bg-black/20 rounded-lg border border-white/5">
            <p className="text-white/60">No trending shows found</p>
          </div>
        ) : uniqueShows.length === 0 ? (
          <div className="text-center py-10 bg-black/20 rounded-lg border border-white/5">
            <p className="text-white/60">No trending shows found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            {uniqueShows.map((show) => {
              const formattedDate = formatDate(show.date);
              const genre = show.genre || show.artist?.genres?.[0] || 'Pop';
              
              return (
                <Link 
                  key={show.id} 
                  to={`/shows/${show.id}`}
                  className="bg-black/40 rounded-lg overflow-hidden border border-white/10 hover:border-white/30 transition-all hover:scale-[1.02] group"
                >
                  <div className="relative aspect-[4/3] overflow-hidden">
                    {show.image_url ? (
                      <img 
                        src={show.image_url} 
                        alt={show.name} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="bg-[#111]/80 w-full h-full flex items-center justify-center">
                        <Calendar className="h-8 w-8 text-white/40" />
                      </div>
                    )}
                    <Badge 
                      className="absolute top-3 right-3 bg-black/60 hover:bg-black/60 text-white"
                    >
                      {genre}
                    </Badge>
                    <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black to-transparent pt-10 pb-4">
                      <div className="flex items-center justify-end px-3">
                        <div className="flex items-center gap-1 bg-white/10 backdrop-blur-sm rounded-full px-2 py-0.5">
                          <Flame className="h-3 w-3 text-orange-500" />
                          <span className="text-white text-xs font-medium">
                            {show.popularityScore?.toLocaleString() || '3,500+'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="font-bold text-base md:text-lg mb-1 line-clamp-1">
                      {show.name?.split(' - ')[0] || 'Untitled Show'}
                    </h3>
                    <p className="text-white/70 text-sm mb-3 line-clamp-1">
                      {show.artist?.name || 'Unknown Artist'}
                    </p>
                    <div className="flex flex-col space-y-2 text-xs md:text-sm text-white/60">
                      <div className="flex items-center">
                        <Calendar size={14} className="mr-2 opacity-70 flex-shrink-0" />
                        <span>
                          {typeof formattedDate === 'object' 
                            ? `${formattedDate.month} ${formattedDate.day}, ${formattedDate.year}` 
                            : formattedDate}
                        </span>
                      </div>
                      {show.venue && (
                        <div className="flex items-start">
                          <MapPin size={14} className="mr-2 mt-0.5 opacity-70 flex-shrink-0" />
                          <span className="line-clamp-1">
                            {show.venue?.name ? `${show.venue.name}, ${show.venue.city || ''}` : 'Venue TBA'}
                          </span>
                        </div>
                      )}
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
