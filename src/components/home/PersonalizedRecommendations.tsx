
import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight, Flame } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { getTrendingConcerts } from '@/lib/ticketmaster';
import { toast } from 'sonner';
import StandardShowCard from '@/components/shows/StandardShowCard';
import { saveArtistToDatabase, saveShowToDatabase, saveVenueToDatabase } from '@/lib/api/database-utils';

interface PersonalizedRecommendationsProps {
  preloadedShows?: any[];
}

const PersonalizedRecommendations = ({ preloadedShows }: PersonalizedRecommendationsProps) => {
  const { data: showsData = [], isLoading, error } = useQuery({
    queryKey: ['personalizedShows'],
    queryFn: async () => {
      // If we have preloaded shows from the parent, use those instead
      if (preloadedShows && preloadedShows.length > 0) {
        return preloadedShows;
      }
      
      try {
        // Fetch more shows to filter out the highest quality ones
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
            // Generate a weighted popularity score for each show
            popularity: Math.floor(Math.random() * 5000) + 2000 // Simulating for demo purposes
          };
          
          // Save show to database
          await saveShowToDatabase(show);
          
          return show;
        }));
        
        // Sort by popularity
        return processedShows.sort((a, b) => 
          (b.popularity || 0) - (a.popularity || 0)
        );
      } catch (error) {
        console.error("Failed to fetch trending shows:", error);
        toast.error("Couldn't load trending shows");
        return [];
      }
    },
  });

  return (
    <section className="py-12 md:py-16 px-4 bg-[#0A0A10]">
      <div className="container mx-auto max-w-7xl">
        <div className="flex justify-between items-center mb-6 md:mb-8">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl md:text-3xl font-bold text-white">Hot Shows</h2>
              <Flame className="h-5 w-5 text-orange-500" />
            </div>
            <p className="text-sm md:text-base text-white/70 mt-1">Hottest shows with active voting right now</p>
          </div>
          <Link to="/shows" className="text-white hover:text-white/80 font-medium flex items-center group">
            <span className="hidden sm:inline">View all</span> <ChevronRight size={16} className="ml-0 sm:ml-1 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
        
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, index) => (
              <div key={index} className="bg-black/40 rounded-lg overflow-hidden border border-white/10">
                <Skeleton className="aspect-[3/2] w-full" />
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
        ) : showsData.length === 0 ? (
          <div className="text-center py-10 bg-black/20 rounded-lg border border-white/5">
            <p className="text-white/60">No trending shows found</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {showsData.slice(0, 8).map((show) => (
              <StandardShowCard key={show.id} show={show} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default PersonalizedRecommendations;
