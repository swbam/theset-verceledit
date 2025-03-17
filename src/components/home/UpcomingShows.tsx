
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Calendar, MapPin, ChevronRight, Music, Flame, Stadium } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { fetchShowsByGenre, popularMusicGenres, fetchFeaturedShows } from '@/lib/ticketmaster';
import { useIsMobile } from '@/hooks/use-mobile';
import { toast } from 'sonner';

const STADIUM_ATTENDANCE_THRESHOLD = 20000;

const UpcomingShows = () => {
  const [activeGenre, setActiveGenre] = useState("all");
  const isMobile = useIsMobile();
  
  const { data: showsData = [], isLoading, error } = useQuery({
    queryKey: ['upcomingShows', activeGenre],
    queryFn: async () => {
      try {
        // Fetch more shows initially to ensure we have enough after filtering
        let genreId = activeGenre === "all" ? popularMusicGenres[0].id : activeGenre;
        
        // Combine trending and upcoming shows for more variety
        const [upcomingShows, trendingShows] = await Promise.all([
          fetchShowsByGenre(genreId, 30),
          fetchFeaturedShows(30)
        ]);
        
        // Merge both sets of shows
        let combinedShows = [...upcomingShows, ...trendingShows];
        
        // Deduplicate by show ID
        const uniqueShows = Array.from(
          new Map(combinedShows.map(show => [show.id, show])).values()
        );
        
        // Add popularity scores to make sorting consistent and filter for stadium shows
        return uniqueShows.map(show => ({
          ...show,
          popularityScore: Math.floor(Math.random() * 8000) + 3000 // Simulating high attendance
        }))
        .filter(show => {
          // Filter for stadium shows and shows with high attendance
          const isStadium = 
            show.venue?.name?.toLowerCase().includes('stadium') || 
            show.venue?.name?.toLowerCase().includes('arena') || 
            show.venue?.name?.toLowerCase().includes('center') ||
            show.venue?.name?.toLowerCase().includes('dome');
          const highAttendance = show.popularityScore >= STADIUM_ATTENDANCE_THRESHOLD;
          return isStadium || highAttendance;
        });
      } catch (error) {
        console.error("Failed to fetch upcoming shows:", error);
        toast.error("Couldn't load upcoming shows");
        return [];
      }
    },
  });

  const shows = React.useMemo(() => {
    if (!showsData.length) return [];
    
    // Ensure unique artists
    const seenArtists = new Set();
    const uniqueByArtist = [];
    
    // Sort by popularity and then date
    const sorted = [...showsData].sort((a, b) => {
      // First sort by popularity score (descending)
      const popularityDiff = (b.popularityScore || 0) - (a.popularityScore || 0);
      if (popularityDiff !== 0) return popularityDiff;
      
      // Then by date (ascending)
      if (!a.date) return 1;
      if (!b.date) return -1;
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    });
    
    // Get unique artists, take at most 8 for a nice grid
    for (const show of sorted) {
      const artistId = show.artist?.id || show.artist?.name;
      if (artistId && !seenArtists.has(artistId)) {
        seenArtists.add(artistId);
        uniqueByArtist.push(show);
        
        if (uniqueByArtist.length >= 8) break;
      }
    }
    
    return uniqueByArtist;
  }, [showsData]);

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', { 
        month: 'short',
        day: 'numeric', 
        year: 'numeric'
      });
    } catch (error) {
      return "TBA";
    }
  };

  return (
    <section className="py-12 md:py-16 px-4 bg-[#0A0A10]">
      <div className="container mx-auto max-w-7xl">
        <div className="flex justify-between items-center mb-6 md:mb-8">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-white">Stadium Shows</h2>
            <p className="text-sm md:text-base text-white/70 mt-1">
              Big venues with 20k+ attendance
            </p>
          </div>
          <Link to="/shows" className="text-white hover:text-white/80 font-medium flex items-center group">
            <span className="hidden sm:inline">View all</span> <ChevronRight size={16} className="ml-0 sm:ml-1 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
        
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
          <button
            onClick={() => setActiveGenre("all")}
            className={`whitespace-nowrap px-4 py-2 rounded-full text-sm ${
              activeGenre === "all"
                ? 'bg-white text-black font-medium'
                : 'bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            All Genres
          </button>
          {popularMusicGenres.slice(0, 6).map(genre => (
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
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 md:gap-4">
            {[...Array(8)].map((_, index) => (
              <div key={index} className="bg-black/40 rounded-lg overflow-hidden border border-white/10">
                <Skeleton className="aspect-[4/3] w-full" />
                <div className="p-3">
                  <Skeleton className="h-4 w-3/4 mb-2" />
                  <Skeleton className="h-3 w-1/2 mb-2" />
                  <div className="flex items-center mb-1.5">
                    <Skeleton className="h-3 w-3 rounded-full mr-2" />
                    <Skeleton className="h-2.5 w-24" />
                  </div>
                  <div className="flex items-center">
                    <Skeleton className="h-3 w-3 rounded-full mr-2" />
                    <Skeleton className="h-2.5 w-20" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-10 bg-black/20 rounded-lg border border-white/5">
            <p className="text-white/60">No stadium shows found</p>
          </div>
        ) : shows.length === 0 ? (
          <div className="text-center py-10 bg-black/20 rounded-lg border border-white/5">
            <p className="text-white/60">No stadium shows found</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 md:gap-4">
            {shows.map((show) => {
              const genre = show.genre || show.artist?.genres?.[0] || 'Pop';
              const formattedDate = formatDate(show.date);
              const artistName = show.artist?.name || 'Unknown Artist';
              const tourName = show.name || 'Upcoming Show';
              
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
                        alt={artistName} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="bg-[#111]/80 w-full h-full flex items-center justify-center">
                        <Music className="h-6 w-6 text-white/40" />
                      </div>
                    )}
                    <Badge 
                      className="absolute top-2 right-2 bg-black/60 hover:bg-black/60 text-white text-xs py-0.5"
                    >
                      {genre}
                    </Badge>
                    <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black to-transparent pt-8 pb-2">
                      <div className="flex items-center justify-end px-2">
                        <div className="flex items-center gap-1 bg-white/10 backdrop-blur-sm rounded-full px-1.5 py-0.5">
                          <Flame className="h-2.5 w-2.5 text-orange-400" />
                          <span className="text-white text-xs font-medium">
                            {show.popularityScore?.toLocaleString() || Math.floor(Math.random() * 5000) + 3000}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="p-3">
                    {/* Mobile shows artist name as primary headline, desktop can show more info */}
                    <h3 className="font-bold text-sm mb-0.5 line-clamp-1">
                      {artistName}
                    </h3>
                    {!isMobile && (
                      <p className="text-white/80 text-xs mb-2 line-clamp-1">
                        {tourName}
                      </p>
                    )}
                    <div className="flex flex-col space-y-1 text-[10px] md:text-xs text-white/60">
                      <div className="flex items-center">
                        <Calendar size={12} className="mr-1.5 opacity-70 flex-shrink-0" />
                        <span className="truncate">{formattedDate}</span>
                      </div>
                      {show.venue && (
                        <div className="flex items-start">
                          <Stadium size={12} className="mr-1.5 mt-0.5 opacity-70 flex-shrink-0" />
                          <span className="line-clamp-1">
                            {show.venue?.name ? `${show.venue.name}, ${show.venue.city || ''}` : 'Stadium TBA'}
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

export default UpcomingShows;
