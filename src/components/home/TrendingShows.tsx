import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { CalendarDays, MapPin, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { getTrendingConcerts } from '@/lib/ticketmaster';

const TrendingShows = () => {
  const { data: showsData = [], isLoading } = useQuery({
    queryKey: ['trendingShows'],
    queryFn: async () => {
      try {
        // Fetch trending concerts from the Ticketmaster API
        const events = await getTrendingConcerts(4);
        
        // Process the events to extract useful information
        return events.map((event: any) => {
          // Extract artist info
          let artistName = '';
          if (event._embedded?.attractions && event._embedded.attractions.length > 0) {
            artistName = event._embedded.attractions[0].name;
          } else {
            artistName = event.name.split(' at ')[0].split(' - ')[0].trim();
          }
          
          // Extract venue info
          let venueCity = '';
          let venueName = '';
          if (event._embedded?.venues && event._embedded.venues.length > 0) {
            const venue = event._embedded.venues[0];
            venueCity = venue.city?.name || '';
            venueName = venue.name || '';
          }
          
          // Generate a votes count for display (since we don't have actual votes yet)
          const randomVotes = Math.floor(Math.random() * 15000) + 5000;
          
          return {
            id: event.id,
            name: event.name,
            artist: { name: artistName },
            image_url: event.images.find((img: any) => img.ratio === "16_9" && img.width > 500)?.url,
            venue: { 
              name: venueName, 
              city: venueCity 
            },
            date: new Date(event.dates.start.dateTime || event.dates.start.localDate).toLocaleDateString('en-US', {
              month: 'long',
              day: 'numeric',
              year: 'numeric'
            }),
            votes: randomVotes
          };
        });
      } catch (error) {
        console.error("Failed to fetch trending shows:", error);
        return [];
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return (
    <section className="py-12 px-4 bg-black">
      <div className="container mx-auto max-w-7xl">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-2xl font-bold text-white">Trending Shows</h2>
            <p className="text-sm text-white/60 mt-1">Shows with the most active voting right now</p>
          </div>
          <Button variant="link" asChild size="sm" className="text-white hover:text-white/80">
            <Link to="/shows" className="flex items-center">
              View all <ChevronRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {isLoading ? (
            [...Array(4)].map((_, i) => (
              <div key={i} className="bg-black border border-white/10 rounded-lg animate-pulse">
                <div className="aspect-[4/3] bg-white/5 relative rounded-t-lg overflow-hidden">
                  <div className="absolute top-4 right-4 h-5 w-16 bg-white/5 rounded-full"></div>
                </div>
                <div className="p-5 space-y-3">
                  <Skeleton className="h-4 w-20 bg-white/5" />
                  <Skeleton className="h-5 w-3/4 bg-white/5" />
                  <Skeleton className="h-4 w-1/2 bg-white/5" />
                </div>
              </div>
            ))
          ) : (
            showsData.map((show) => (
              <Link 
                key={show.id} 
                to={`/shows/${show.id}`}
                className="block bg-black rounded-lg overflow-hidden border border-white/10 hover:border-white/30 transition-all"
              >
                <div className="relative aspect-[4/3] overflow-hidden">
                  {show.image_url ? (
                    <img 
                      src={show.image_url} 
                      alt={show.name}
                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-t from-black to-zinc-800 flex items-center justify-center">
                      <CalendarDays className="h-8 w-8 text-white/30" />
                    </div>
                  )}
                  <Badge 
                    variant="outline" 
                    className="absolute top-3 right-3 bg-black/60 border-white/10 text-white text-xs font-normal py-0.5"
                  >
                    {new Intl.NumberFormat().format(show.votes)} votes
                  </Badge>
                </div>
                <div className="p-5">
                  <div className="mb-1 text-xs text-white/60 uppercase tracking-wide font-semibold">
                    {show.artist.name}
                  </div>
                  <h3 className="font-bold text-base mb-2 text-white line-clamp-1">
                    {show.name}
                  </h3>
                  <div className="flex items-center text-xs text-white/60">
                    <CalendarDays className="h-3.5 w-3.5 mr-1.5" />
                    {show.date}
                  </div>
                  <div className="flex items-center text-xs text-white/60 mt-1">
                    <MapPin className="h-3.5 w-3.5 mr-1.5" />
                    {show.venue?.name || 'Unknown Venue'}, {show.venue?.city || 'Unknown Location'}
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </section>
  );
};

export default TrendingShows;
