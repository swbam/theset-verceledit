
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Calendar, MapPin, ChevronRight, Music, Flame } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { getTrendingConcerts, popularMusicGenres } from '@/lib/ticketmaster';
import { useIsMobile } from '@/hooks/use-mobile';
import { toast } from 'sonner';
import { saveArtistToDatabase, saveShowToDatabase, saveVenueToDatabase } from '@/lib/api/database-utils';

const UpcomingShows = () => {
  const [activeGenre, setActiveGenre] = useState("all");
  const isMobile = useIsMobile();
  
  const { data: concerts = [], isLoading, error } = useQuery({
    queryKey: ['trendingConcerts', activeGenre],
    queryFn: async () => {
      try {
        // Fetch trending concerts
        const events = await getTrendingConcerts(20);
        
        // Process events to extract useful data
        const processedShows = await Promise.all(events.map(async (event: any) => {
          // Get artist from attractions if available
          let artistName = '';
          let artistId = '';
          let artistData = null;
          let genreName = 'Music';
          
          if (event._embedded?.attractions && event._embedded.attractions.length > 0) {
            const attraction = event._embedded.attractions[0];
            artistName = attraction.name;
            artistId = attraction.id;
            
            // Get genre if available
            if (event.classifications && event.classifications[0]) {
              const classification = event.classifications[0];
              genreName = classification.genre?.name || 
                          classification.subGenre?.name || 
                          classification.segment?.name || 
                          'Music';
            }
            
            // Create artist object
            artistData = {
              id: artistId,
              name: artistName,
              image: attraction.images?.find((img: any) => img.ratio === "16_9" && img.width > 500)?.url,
              upcoming_shows: 1,
              genres: [genreName].filter(Boolean)
            };
            
            // Save artist to database
            await saveArtistToDatabase(artistData);
          } else {
            // Fallback to extracting from event name
            artistName = event.name.split(' at ')[0].split(' - ')[0].trim();
            artistId = `tm-${encodeURIComponent(artistName.toLowerCase().replace(/\s+/g, '-'))}`;
            
            // Create minimal artist data
            artistData = {
              id: artistId,
              name: artistName
            };
          }
          
          // Process venue
          let venue = null;
          let venueId = null;
          if (event._embedded?.venues?.[0]) {
            const venueData = event._embedded.venues[0];
            venue = {
              id: venueData.id,
              name: venueData.name,
              city: venueData.city?.name,
              state: venueData.state?.name,
              country: venueData.country?.name,
            };
            venueId = venueData.id;
            
            // Save venue to database
            await saveVenueToDatabase(venue);
          }
          
          // Create show object
          const show = {
            id: event.id,
            name: event.name,
            date: event.dates.start.dateTime || event.dates.start.localDate,
            artist_id: artistId,
            venue_id: venueId,
            ticket_url: event.url,
            image_url: event.images.find((img: any) => img.ratio === "16_9" && img.width > 500)?.url,
            genre: genreName,
            artist: artistData,
            venue: venue,
            popularity: Math.floor(Math.random() * 8000) + 3000 // Random popularity for now
          };
          
          // Save show to database
          await saveShowToDatabase(show);
          
          return show;
        }));
        
        // If we want to filter by genre
        if (activeGenre !== "all") {
          const genreName = popularMusicGenres.find(g => g.id === activeGenre)?.name.toLowerCase() || '';
          return processedShows.filter(show => 
            show.genre?.toLowerCase().includes(genreName) || 
            show.artist?.genres?.some((g: string) => g.toLowerCase().includes(genreName))
          );
        }
        
        return processedShows;
      } catch (error) {
        console.error("Failed to fetch trending concerts:", error);
        toast.error("Couldn't load trending shows");
        return [];
      }
    },
  });

  const formatDate = (dateString: string) => {
    if (!dateString) return "TBA";
    
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
            <h2 className="text-2xl md:text-3xl font-bold text-white">Trending Shows</h2>
            <p className="text-sm md:text-base text-white/70 mt-1">
              Hottest concerts coming up soon
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
            <p className="text-white/60">No trending shows found</p>
          </div>
        ) : concerts.length === 0 ? (
          <div className="text-center py-10 bg-black/20 rounded-lg border border-white/5">
            <p className="text-white/60">No trending shows found</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 md:gap-4">
            {concerts.slice(0, 8).map((show) => {
              const genre = show.genre || show.artist?.genres?.[0] || 'Music';
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
                            {show.popularity?.toLocaleString() || Math.floor(Math.random() * 5000) + 3000}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="p-3">
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
                          <MapPin size={12} className="mr-1.5 mt-0.5 opacity-70 flex-shrink-0" />
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

export default UpcomingShows;
