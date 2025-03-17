
import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight } from 'lucide-react';
import { getTrendingConcerts } from '@/lib/ticketmaster';
import { saveArtistToDatabase, saveShowToDatabase, saveVenueToDatabase } from '@/lib/api/database-utils';
import StandardShowCard from '@/components/shows/StandardShowCard';

const TrendingShows = () => {
  // Fetch trending shows
  const { 
    data: trendingShows = [], 
    isLoading: isTrendingLoading,
  } = useQuery({
    queryKey: ['trendingShowsCarousel'],
    queryFn: async () => {
      try {
        // Fetch trending concerts
        const events = await getTrendingConcerts(8);
        
        // Process events to extract useful data
        return await Promise.all(events.map(async (event: any) => {
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
            popularity: Math.floor(Math.random() * 5000) + 1000 // Random popularity for display
          };
          
          // Save show to database
          await saveShowToDatabase(show);
          
          return show;
        }));
      } catch (error) {
        console.error("Failed to fetch trending shows:", error);
        return [];
      }
    },
  });

  return (
    <section className="px-4 md:px-8 lg:px-12 py-16 bg-black">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white">Hot Shows</h2>
            <p className="text-sm text-white/70 mt-1">Shows with the most active voting right now</p>
          </div>
          <Link to="/shows" className="flex items-center text-sm text-white hover:text-white/80">
            View all <ChevronRight size={16} />
          </Link>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {isTrendingLoading ? (
            Array(4).fill(0).map((_, i) => (
              <div key={i} className="bg-[#111111]/80 border border-white/10 rounded-lg overflow-hidden">
                <div className="aspect-[3/2] bg-[#222]"></div>
                <div className="p-4">
                  <div className="h-5 bg-[#333] rounded w-3/4 mb-2"></div>
                  <div className="h-4 bg-[#333] rounded w-1/2 mb-4"></div>
                  <div className="space-y-2">
                    <div className="flex items-center">
                      <div className="h-4 w-4 rounded-full bg-[#333] mr-2"></div>
                      <div className="h-3 bg-[#333] rounded w-1/3"></div>
                    </div>
                    <div className="flex items-center">
                      <div className="h-4 w-4 rounded-full bg-[#333] mr-2"></div>
                      <div className="h-3 bg-[#333] rounded w-2/3"></div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            trendingShows.map((show: any) => (
              <StandardShowCard key={show.id} show={show} />
            ))
          )}
        </div>
      </div>
    </section>
  );
};

export default TrendingShows;
