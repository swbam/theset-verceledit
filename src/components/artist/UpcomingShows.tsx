
import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, MapPin, Clock, Ticket, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { formatDate } from '@/lib/api/mock-service';
import { Badge } from '@/components/ui/badge';

interface UpcomingShowsProps {
  shows: any[];
  artistName: string;
}

const UpcomingShows = ({
  shows,
  artistName
}: UpcomingShowsProps) => {
  const [displayedShows, setDisplayedShows] = useState<any[]>([]);
  const [visibleCount, setVisibleCount] = useState(5);
  const loadingRef = useRef<HTMLDivElement>(null);

  // Format date to show day of week
  const formatShowDate = (dateString: string) => {
    const date = new Date(dateString);
    return {
      dayOfWeek: date.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase(),
      day: date.toLocaleDateString('en-US', { day: 'numeric' }),
      month: date.toLocaleDateString('en-US', { month: 'short' }).toUpperCase(),
      time: date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
    };
  };

  // Initialize the displayed shows
  useEffect(() => {
    setDisplayedShows(shows.slice(0, visibleCount));
  }, [shows, visibleCount]);

  // Set up intersection observer for infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && displayedShows.length < shows.length) {
          // Load more shows when the loading div comes into view
          setVisibleCount(prev => Math.min(prev + 5, shows.length));
        }
      },
      { threshold: 0.1 }
    );

    if (loadingRef.current) {
      observer.observe(loadingRef.current);
    }

    return () => {
      if (loadingRef.current) {
        observer.unobserve(loadingRef.current);
      }
    };
  }, [displayedShows.length, shows.length]);

  // If no shows, display a message
  if (!shows.length) {
    return (
      <section className="px-6 md:px-8 lg:px-12 py-12 bg-black">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between mb-8">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-white">Upcoming Shows</h2>
              <p className="text-white/70 mt-1">No upcoming shows found for {artistName}</p>
            </div>
          </div>
          
          <div className="text-center p-10 border border-white/10 rounded-xl bg-white/5">
            <p className="text-lg mb-4 text-white">No upcoming concerts found for this artist.</p>
            <Button variant="outline" className="border-white/20 bg-white/5 text-white hover:bg-white/10" asChild>
              <Link to="/shows">Discover other shows</Link>
            </Button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="px-6 md:px-8 lg:px-12 py-12 bg-black">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between mb-8">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-white">Upcoming Shows</h2>
            <p className="text-white/70 mt-1">Vote on setlists for upcoming shows</p>
          </div>
        </div>
        
        {/* Mobile view: Cards for small screens - redesigned for better spacing */}
        <div className="md:hidden space-y-4">
          {displayedShows.map((show) => {
            const dateInfo = formatShowDate(show.date);
            return (
              <div key={show.id} className="bg-white/5 border border-white/10 rounded-lg overflow-hidden hover:border-white/20 transition-colors">
                <div className="flex items-center p-4">
                  {/* Date box */}
                  <div className="flex-shrink-0 w-14 h-14 bg-white/10 rounded-lg flex flex-col items-center justify-center text-center">
                    <span className="text-xs text-white/70">{dateInfo.month}</span>
                    <span className="text-xl font-bold leading-tight">{dateInfo.day}</span>
                    <span className="text-xs text-white/70">{dateInfo.dayOfWeek}</span>
                  </div>
                  
                  <div className="flex-1 min-w-0 pl-3">
                    <h3 className="font-bold text-white truncate">{artistName}</h3>
                    <h4 className="text-sm text-white/80 truncate">{show.venue?.name || "Venue TBA"}</h4>
                    <div className="flex items-center text-xs text-white/60 mt-1">
                      <MapPin className="h-3 w-3 mr-1 flex-shrink-0" />
                      <span className="truncate">
                        {show.venue?.city || ""}
                        {show.venue?.state && show.venue?.city ? `, ${show.venue.state}` : show.venue?.state || ""}
                      </span>
                    </div>
                  </div>
                  
                  <Button size="sm" className="ml-2 flex-shrink-0" asChild>
                    <Link to={`/shows/${show.id}`}>
                      <Ticket className="h-3.5 w-3.5 mr-1.5" />
                      Setlist
                    </Link>
                  </Button>
                </div>
              </div>
            );
          })}
          
          {/* Loading indicator or "See All" button */}
          <div ref={loadingRef} className="py-2 text-center">
            {displayedShows.length < shows.length ? (
              <div className="w-8 h-8 mx-auto border-2 border-t-transparent border-white rounded-full animate-spin"></div>
            ) : shows.length > visibleCount && (
              <Button variant="outline" className="w-full border-white/10 bg-white/5 text-white hover:bg-white/10" asChild>
                <Link to={`/shows?artist=${encodeURIComponent(artistName)}`}>
                  See all {shows.length} shows
                </Link>
              </Button>
            )}
          </div>
        </div>
        
        {/* Desktop view: Simplified table for larger screens */}
        <div className="hidden md:block bg-white/5 border border-white/10 rounded-lg overflow-hidden">
          <ScrollArea className="max-h-[600px]">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-white/5 border-white/10">
                  <TableHead className="text-white/70 w-28">Date</TableHead>
                  <TableHead className="text-white/70">Artist & Venue</TableHead>
                  <TableHead className="text-right w-32"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayedShows.map((show, index) => {
                  const dateInfo = formatShowDate(show.date);
                  
                  return (
                    <TableRow 
                      key={show.id} 
                      className={`hover:bg-white/10 border-white/10 ${index === displayedShows.length - 1 && displayedShows.length === shows.length ? 'border-none' : ''}`}
                    >
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-3">
                          <div className="flex-shrink-0 w-12 h-12 bg-white/10 rounded-md text-center flex flex-col justify-center">
                            <span className="text-xs text-white/70">{dateInfo.month}</span>
                            <span className="text-lg font-bold">{dateInfo.day}</span>
                          </div>
                          <div className="text-sm">
                            <div className="font-medium">{dateInfo.dayOfWeek}</div>
                            <div className="text-white/70">{dateInfo.time}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-bold text-white">{artistName}</div>
                        <div className="font-medium text-white/80">{show.venue?.name || "Venue TBA"}</div>
                        <div className="flex items-center text-sm text-white/70 mt-1">
                          <MapPin className="h-3.5 w-3.5 mr-1.5 flex-shrink-0" />
                          <span>
                            {show.venue?.city || ""}
                            {show.venue?.state && show.venue?.city ? `, ${show.venue.state}` : show.venue?.state || ""}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" className="bg-white text-[#0A0A16] hover:bg-white/90" asChild>
                          <Link to={`/shows/${show.id}`}>
                            <Ticket className="h-4 w-4 mr-2" />
                            View Setlist
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </ScrollArea>
          
          {/* Loading indicator for desktop */}
          <div ref={loadingRef} className="p-4 border-t border-white/10 bg-white/5 text-center">
            {displayedShows.length < shows.length ? (
              <div className="w-8 h-8 mx-auto border-2 border-t-transparent border-white rounded-full animate-spin"></div>
            ) : shows.length > visibleCount && (
              <Button variant="outline" className="w-full text-white border-white/10 bg-transparent hover:bg-white/10" asChild>
                <Link to={`/shows?artist=${encodeURIComponent(artistName)}`} className="flex items-center justify-center">
                  <Calendar className="h-4 w-4 mr-2" />
                  See all {shows.length} shows
                  <ArrowRight className="ml-1.5 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </Button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default UpcomingShows;
