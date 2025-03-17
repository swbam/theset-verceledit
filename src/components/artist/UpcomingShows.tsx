
import React from 'react';
import { Link } from 'react-router-dom';
import { Calendar, MapPin, Clock, Ticket, ArrowRight, Music } from 'lucide-react';
import { Button } from '@/components/ui/button';
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

  return (
    <section className="px-6 md:px-8 lg:px-12 py-12 bg-black">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between mb-8">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-white">Upcoming Shows</h2>
            <p className="text-white/70 mt-1">Vote on setlists for upcoming shows</p>
          </div>
          
          {shows.length > 8 && (
            <Button variant="ghost" className="mt-4 md:mt-0 group text-white hover:text-white hover:bg-white/5" asChild>
              <Link to={`/shows?artist=${encodeURIComponent(artistName)}`} className="flex items-center">
                See all {shows.length} shows
                <ArrowRight className="ml-1.5 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </Button>
          )}
        </div>
        
        {/* Mobile view: Cards for small screens */}
        <div className="md:hidden space-y-4">
          {shows.slice(0, 4).map((show) => {
            const dateInfo = formatShowDate(show.date);
            return (
              <div key={show.id} className="bg-white/5 border border-white/10 rounded-lg overflow-hidden hover:border-white/20 transition-colors">
                <div className="p-4">
                  <div className="flex items-start gap-4">
                    {/* Date box */}
                    <div className="flex-shrink-0 w-16 h-16 bg-white/10 rounded-lg flex flex-col items-center justify-center text-center p-1">
                      <span className="text-xs text-white/70">{dateInfo.dayOfWeek}</span>
                      <span className="text-xl font-bold">{dateInfo.day}</span>
                      <span className="text-xs text-white/70">{dateInfo.month}</span>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-white truncate">{show.venue?.name || "Venue TBA"}</h3>
                      <div className="flex items-center text-sm text-white/60 mt-1">
                        <MapPin className="h-3.5 w-3.5 mr-1 flex-shrink-0" />
                        <span className="truncate">
                          {show.venue?.city || ""}
                          {show.venue?.state && show.venue?.city ? `, ${show.venue.state}` : show.venue?.state || ""}
                        </span>
                      </div>
                      <div className="flex items-center text-sm text-white/60 mt-1">
                        <Clock className="h-3.5 w-3.5 mr-1 flex-shrink-0" />
                        <span>{dateInfo.time}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 border-t border-white/10 pt-4">
                    <Button className="w-full" size="sm" asChild>
                      <Link to={`/shows/${show.id}`}>
                        <Ticket className="h-4 w-4 mr-2" />
                        View Setlist
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
          
          {shows.length > 4 && (
            <Button variant="outline" className="w-full border-white/10 bg-white/5 text-white hover:bg-white/10" asChild>
              <Link to={`/shows?artist=${encodeURIComponent(artistName)}`}>
                View All {shows.length} Shows
              </Link>
            </Button>
          )}
        </div>
        
        {/* Desktop view: Table for larger screens */}
        <div className="hidden md:block bg-white/5 border border-white/10 rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-white/5 border-white/10">
                <TableHead className="text-white/70 w-48">Date & Time</TableHead>
                <TableHead className="text-white/70">Venue</TableHead>
                <TableHead className="text-white/70 hidden lg:table-cell">Location</TableHead>
                <TableHead className="text-white/70 hidden lg:table-cell">Event</TableHead>
                <TableHead className="text-right"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {shows.slice(0, 8).map((show, index) => {
                const dateInfo = formatShowDate(show.date);
                const tourName = show.name?.split(' - ')[0] || 'Concert';
                
                return (
                  <TableRow 
                    key={show.id} 
                    className={`hover:bg-white/10 border-white/10 ${index === shows.length - 1 ? 'border-none' : ''}`}
                  >
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-3">
                        <div className="flex-shrink-0 flex flex-col items-center justify-center w-12 h-12 bg-white/10 rounded-md text-center">
                          <span className="text-xs text-white/70">{dateInfo.month}</span>
                          <span className="text-lg font-bold leading-tight">{dateInfo.day}</span>
                        </div>
                        <div>
                          <div className="font-medium">{dateInfo.dayOfWeek}</div>
                          <div className="text-sm text-white/70">{dateInfo.time}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-white">{show.venue?.name || "Venue TBA"}</div>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <div className="flex items-center text-white/70">
                        <MapPin className="h-4 w-4 mr-2 flex-shrink-0" />
                        <span>
                          {show.venue?.city || ""}
                          {show.venue?.state && show.venue?.city ? `, ${show.venue.state}` : show.venue?.state || ""}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {tourName !== artistName && (
                        <Badge variant="outline" className="bg-white/5 border-white/10">
                          {tourName}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button className="bg-white text-[#0A0A16] hover:bg-white/90" size="sm" asChild>
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
          
          {shows.length > 8 && (
            <div className="p-4 border-t border-white/10 bg-white/5">
              <Button variant="outline" className="w-full text-white border-white/10 bg-transparent hover:bg-white/10" asChild>
                <Link to={`/shows?artist=${encodeURIComponent(artistName)}`} className="flex items-center justify-center">
                  <Calendar className="h-4 w-4 mr-2" />
                  See all {shows.length} shows
                  <ArrowRight className="ml-1.5 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default UpcomingShows;
