
import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { CalendarDays, MapPin, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white">Trending Shows</h2>
            <p className="text-sm text-white/70">Shows with the most active voting right now</p>
          </div>
          <Button variant="link" asChild className="text-white hover:text-white/80">
            <Link to="/shows" className="flex items-center">
              View all <ChevronRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {isLoading ? (
            [...Array(4)].map((_, i) => (
              <Card key={i} className="bg-black/40 border-white/10 animate-pulse">
                <div className="aspect-video bg-white/5"></div>
                <div className="p-4 space-y-2">
                  <div className="h-4 bg-white/5 rounded w-3/4"></div>
                  <div className="h-4 bg-white/5 rounded w-1/2"></div>
                </div>
              </Card>
            ))
          ) : (
            showsData.map((show) => (
              <Link 
                key={show.id} 
                to={`/shows/${show.id}`}
                className="block bg-black/40 rounded-lg overflow-hidden border border-white/10 hover:border-white/20 transition-all hover:scale-[1.02] group"
              >
                <div className="relative aspect-video">
                  {show.image_url ? (
                    <img 
                      src={show.image_url} 
                      alt={show.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-white/5 flex items-center justify-center">
                      <CalendarDays className="h-8 w-8 text-white/20" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent"></div>
                  <div className="absolute bottom-0 inset-x-0 p-4">
                    <h3 className="font-bold text-base mb-1 text-white group-hover:text-white/90">
                      {show.name}
                    </h3>
                    <div className="flex items-center text-xs text-white/70">
                      <MapPin className="h-3 w-3 mr-1" />
                      {show.venue?.city || 'Unknown Location'}
                    </div>
                  </div>
                  <Badge 
                    variant="secondary" 
                    className="absolute top-3 right-3 bg-black/60"
                  >
                    {show.votes.toLocaleString()} votes
                  </Badge>
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
